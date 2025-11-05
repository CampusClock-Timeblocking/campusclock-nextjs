import { NextResponse } from "next/server";
import { CacheService } from "@/server/api/services/cache-service";
import { env } from "@/env";

/**
 * GET /api/cache/purge
 * Purges all cache from Upstash Redis
 * Only works in development mode for safety
 */
export async function GET() {
  try {
    // Safety check - only allow in development
    if (env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cache purge is not allowed in production" },
        { status: 403 }
      );
    }

    const cacheService = new CacheService();
    await cacheService.flushAll();

    return NextResponse.json(
      {
        success: true,
        message: "Cache purged successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to purge cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to purge cache",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

