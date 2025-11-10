import crypto from "crypto";
import { env } from "@/env";

/**
 * Encryption utility for sensitive data like passwords and tokens
 * Uses AES-256-GCM encryption with authentication
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // AES block size
const SALT_LENGTH = 16;

/**
 * Derives a key from the encryption secret using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(env.BETTER_AUTH_SECRET, salt, 100000, 32, "sha256");
}

/**
 * Encrypts a string value
 * @param text - The plaintext string to encrypt
 * @returns The encrypted string in format: salt:iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Return format: salt:iv:authTag:encryptedData
  return [
    salt.toString("base64"),
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted,
  ].join(":");
}

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted string in format: salt:iv:authTag:encryptedData
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [saltB64, ivB64, authTagB64, encryptedData] = parts as [
    string,
    string,
    string,
    string,
  ];

  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Checks if a string is already encrypted (has the expected format)
 * @param text - The string to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  if (parts.length !== 4) return false;

  try {
    // Try to decode each part as base64
    parts.forEach((part) => Buffer.from(part, "base64"));
    return true;
  } catch {
    return false;
  }
}
