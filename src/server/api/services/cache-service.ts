import { Redis, } from "@upstash/redis";
import { env } from "@/env";

/**
 * Generic cache service using Upstash Redis
 * Provides simple get/set operations with TTL support
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number; // in seconds

  constructor(defaultTTL = 300) {
    // Default 5 minutes
    this.redis = new Redis({
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
    });
    this.defaultTTL = defaultTTL;
  }

  /**
   * Recursively convert ISO date strings back to Date objects
   * This is needed because JSON serialization converts Dates to strings
   */
  private reviveDates<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return value.map((item: any) => this.reviveDates(item)) as T;
    }

    // Handle objects
    if (typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        // Check if it's a date string (ISO 8601 format)
        if (
          typeof val === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)
        ) {
          result[key] = new Date(val);
        } else {
          result[key] = this.reviveDates(val);
        }
      }
      return result as T;
    }

    return value;
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Upstash Redis automatically deserializes JSON, so we don't need to parse
      const value = await this.redis.get<T>(key);
      if (!value) return null;

      // Convert date strings back to Date objects if needed
      return this.reviveDates(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttl Time to live in seconds (optional, uses defaultTTL if not provided)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const expirationTime = ttl ?? this.defaultTTL;

      // Upstash Redis automatically serializes, so we just pass the value
      if (expirationTime > 0) {
        await this.redis.setex(key, expirationTime, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Pattern to match (e.g., "user:123:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set a value in cache
   * If the key exists, returns the cached value
   * If not, executes the fetcher function, caches the result, and returns it
   * @param key Cache key
   * @param fetcher Function to fetch the value if not in cache
   * @param ttl Time to live in seconds (optional)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the value
    const value = await fetcher();

    // Cache the result (don't await to not block the return)
    void this.set(key, value, ttl);

    return value;
  }

  /**
   * Generate a cache key for events
   * @param userId User ID
   * @param start Start date
   * @param end End date
   */
  static generateEventsKey(userId: string, start: Date, end: Date): string {
    return `events:${userId}:${start.toISOString()}:${end.toISOString()}`;
  }

  /**
   * Generate a cache key for a specific event
   * @param userId User ID
   * @param eventId Event ID
   */
  static generateEventKey(userId: string, eventId: string): string {
    return `event:${userId}:${eventId}`;
  }

  /**
   * Generate a cache key pattern for invalidating all user events
   * @param userId User ID
   */
  static generateUserEventsPattern(userId: string): string {
    return `events:${userId}:*`;
  }

  /**
   * Generate a cache key pattern for invalidating all user event data
   * @param userId User ID
   */
  static generateUserEventPattern(userId: string): string {
    return `event:${userId}:*`;
  }

  /**
   * Flush all keys from the cache
   * WARNING: This will delete ALL data in the Redis instance
   * Should only be used in development
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error("Cache flush all error:", error);
      throw error;
    }
  }
}
