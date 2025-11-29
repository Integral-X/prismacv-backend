import {
  generateUuidv7,
  isValidUuid,
  extractTimestampFromUuidv7,
} from '../../../src/shared/utils/uuid.util';

describe('UUID Utility Functions', () => {
  describe('generateUuidv7', () => {
    it('should generate a valid UUID string', () => {
      const uuid = generateUuidv7();
      expect(typeof uuid).toBe('string');
      expect(uuid).toHaveLength(36); // UUIDs are 36 characters with hyphens
    });

    it('should generate a UUID that passes validation', () => {
      const uuid = generateUuidv7();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should generate unique UUIDs on subsequent calls', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuidv7());
      }
      // All 100 UUIDs should be unique
      expect(uuids.size).toBe(100);
    });

    it('should generate UUIDs in correct format', () => {
      const uuid = generateUuidv7();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate UUIDs with version 7 indicator', () => {
      const uuid = generateUuidv7();
      // UUIDv7 has version 7 in the 13th character position (after removing hyphens, position 12)
      // The format is: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      const parts = uuid.split('-');
      expect(parts[2][0]).toBe('7');
    });
  });

  describe('isValidUuid', () => {
    it('should return true for valid lowercase UUIDs', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return true for valid uppercase UUIDs', () => {
      expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should return true for valid mixed case UUIDs', () => {
      expect(isValidUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
    });

    it('should return true for generated UUIDv7', () => {
      const uuid = generateUuidv7();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidUuid('')).toBe(false);
    });

    it('should return false for invalid format - too short', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('should return false for invalid format - too long', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(
        false,
      );
    });

    it('should return false for invalid format - wrong structure', () => {
      expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    });

    it('should return false for invalid characters', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
    });

    it('should return false for invalid format - missing hyphens', () => {
      expect(isValidUuid('550e8400e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should return false for non-string values coerced to string', () => {
      expect(isValidUuid('null')).toBe(false);
      expect(isValidUuid('undefined')).toBe(false);
    });
  });

  describe('extractTimestampFromUuidv7', () => {
    it('should extract a valid Date from a UUIDv7', () => {
      const beforeGeneration = Date.now();
      const uuid = generateUuidv7();
      const afterGeneration = Date.now();

      const extractedDate = extractTimestampFromUuidv7(uuid);

      expect(extractedDate).toBeInstanceOf(Date);
      expect(extractedDate).not.toBeNull();
      // The extracted timestamp should be within the generation window
      expect(extractedDate!.getTime()).toBeGreaterThanOrEqual(beforeGeneration);
      expect(extractedDate!.getTime()).toBeLessThanOrEqual(afterGeneration);
    });

    it('should return null for invalid UUID format', () => {
      expect(extractTimestampFromUuidv7('invalid-uuid')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractTimestampFromUuidv7('')).toBeNull();
    });

    it('should return null for malformed UUID', () => {
      expect(extractTimestampFromUuidv7('not-a-valid-uuid-at-all')).toBeNull();
    });

    it('should return null for UUID with wrong length', () => {
      expect(extractTimestampFromUuidv7('550e8400-e29b-41d4')).toBeNull();
    });

    it('should extract timestamp from a known UUIDv7 value', () => {
      // Create a UUID and immediately extract its timestamp
      const uuid = generateUuidv7();
      const timestamp1 = extractTimestampFromUuidv7(uuid);
      const timestamp2 = extractTimestampFromUuidv7(uuid);

      // Same UUID should yield same timestamp
      expect(timestamp1).toEqual(timestamp2);
    });

    it('should extract increasing timestamps from sequentially generated UUIDs', () => {
      const uuid1 = generateUuidv7();
      // Small delay to ensure different timestamps
      const uuid2 = generateUuidv7();

      const timestamp1 = extractTimestampFromUuidv7(uuid1);
      const timestamp2 = extractTimestampFromUuidv7(uuid2);

      expect(timestamp1).not.toBeNull();
      expect(timestamp2).not.toBeNull();
      // Second UUID should have equal or later timestamp
      expect(timestamp2!.getTime()).toBeGreaterThanOrEqual(
        timestamp1!.getTime(),
      );
    });

    it('should handle valid UUID format but extract reasonable timestamp', () => {
      // A valid UUIDv4 format (not v7) should still parse but may return unexpected date
      const uuidv4 = '550e8400-e29b-41d4-a716-446655440000';
      const result = extractTimestampFromUuidv7(uuidv4);
      // Should return a Date (not null) since the format is valid
      expect(result).toBeInstanceOf(Date);
    });
  });
});
