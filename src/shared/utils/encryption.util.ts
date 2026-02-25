import * as crypto from 'crypto';

/**
 * Utility class for symmetric AES-256-GCM encryption.
 * Designed to securely store short-lived sensitive tokens in the database.
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;
  private static readonly TAG_POSITION = this.SALT_LENGTH + this.IV_LENGTH;

  /**
   * Encrypts a plaintext string using AES-256-GCM.
   * Format: Base64(salt + iv + tag + ciphertext)
   */
  static encrypt(plaintext: string, secretKey: string): string {
    if (!plaintext) return plaintext;
    if (!secretKey || secretKey.length < 32) {
      throw new Error('Encryption requires a 32-character ENCRYPTION_KEY');
    }

    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const key = crypto.pbkdf2Sync(secretKey, salt, 100000, 32, 'sha512');

    const cipher = crypto.createCipheriv(this.ALGORITHM, iv, key);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decrypts a previously formatted Base64 payload back to plaintext.
   */
  static decrypt(ciphertextBase64: string, secretKey: string): string {
    if (!ciphertextBase64) return ciphertextBase64;
    if (!secretKey || secretKey.length < 32) {
      throw new Error('Decryption requires a 32-character ENCRYPTION_KEY');
    }

    try {
      const buffer = Buffer.from(ciphertextBase64, 'base64');

      const salt = buffer.subarray(0, this.SALT_LENGTH);
      const iv = buffer.subarray(this.SALT_LENGTH, this.TAG_POSITION);
      const tag = buffer.subarray(
        this.TAG_POSITION,
        this.TAG_POSITION + this.TAG_LENGTH,
      );
      const encrypted = buffer.subarray(this.TAG_POSITION + this.TAG_LENGTH);

      const key = crypto.pbkdf2Sync(secretKey, salt, 100000, 32, 'sha512');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, iv, key);
      decipher.setAuthTag(tag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      // If decryption fails (e.g., key changed or data corrupted)
      // Throw an error early to avoid returning garbage data
      throw new Error('Failed to decrypt token securely.');
    }
  }
}
