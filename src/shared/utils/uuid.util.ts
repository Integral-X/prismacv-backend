import { uuidv7 } from 'uuidv7';

/**
 * Generates a UUIDv7 (time-ordered UUID)
 * UUIDv7 is a time-ordered UUID that combines:
 * - Unix timestamp in milliseconds (48 bits)
 * - Random data (74 bits)
 *
 * Benefits:
 * - Lexicographically sortable by creation time
 * - Better database index performance than random UUIDs
 * - Globally unique without coordination
 *
 * @returns A new UUIDv7 string
 */
export function generateUuidv7(): string {
  return uuidv7();
}

/**
 * Validates if a string is a valid UUID format
 * @param uuid - The string to validate
 * @returns true if valid UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extracts the timestamp from a UUIDv7
 * @param uuid - The UUIDv7 string
 * @returns The Date when the UUID was created, or null if invalid
 */
export function extractTimestampFromUuidv7(uuid: string): Date | null {
  if (!isValidUuid(uuid)) {
    return null;
  }

  try {
    // UUIDv7 has the timestamp in the first 48 bits
    const hex = uuid.replace(/-/g, '').substring(0, 12);
    const timestamp = parseInt(hex, 16);
    return new Date(timestamp);
  } catch {
    return null;
  }
}
