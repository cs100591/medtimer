/**
 * Feature: medication-reminder-app, Property 17: Data Encryption and Security
 * Validates: Requirements 9.1, 9.3
 * 
 * Property: For any personal health data stored or transmitted, the system should
 * use appropriate encryption (on-device for storage, end-to-end for sharing)
 */

import * as fc from 'fast-check';
import { encrypt, decrypt, encryptField, decryptField, hashData } from '../utils/encryption';

describe('Property 17: Data Encryption and Security', () => {
  describe('encrypt/decrypt round-trip', () => {
    it('should decrypt to original value for any string input', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          return decrypted === plaintext;
        }),
        { numRuns: 100 }
      );
    });

    it('should decrypt to original value for any unicode string', () => {
      fc.assert(
        fc.property(fc.unicodeString(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          return decrypted === plaintext;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle very long strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1000, maxLength: 10000 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            return decrypted === plaintext;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('encryptField/decryptField round-trip', () => {
    it('should decrypt field to original value for any string', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encryptField(plaintext);
          const decrypted = decryptField(encrypted);
          return decrypted === plaintext;
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid JSON string', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encryptField(plaintext);
          try {
            JSON.parse(encrypted);
            return true;
          } catch {
            return false;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('encryption produces different ciphertext', () => {
    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (plaintext) => {
          const encrypted1 = encrypt(plaintext);
          const encrypted2 = encrypt(plaintext);
          // IVs should be different
          return encrypted1.iv !== encrypted2.iv;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('encrypted data structure', () => {
    it('should contain iv, encryptedData, and authTag', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          return (
            typeof encrypted.iv === 'string' &&
            typeof encrypted.encryptedData === 'string' &&
            typeof encrypted.authTag === 'string' &&
            encrypted.iv.length > 0 &&
            encrypted.authTag.length > 0
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should have consistent IV length (32 hex chars = 16 bytes)', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          return encrypted.iv.length === 32;
        }),
        { numRuns: 100 }
      );
    });

    it('should have consistent auth tag length (32 hex chars = 16 bytes)', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          return encrypted.authTag.length === 32;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('hash function properties', () => {
    it('should produce consistent hash for same input', () => {
      fc.assert(
        fc.property(fc.string(), (data) => {
          const hash1 = hashData(data);
          const hash2 = hashData(data);
          return hash1 === hash2;
        }),
        { numRuns: 100 }
      );
    });

    it('should produce different hashes for different inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (data1, data2) => {
            if (data1 === data2) return true; // Skip if same
            const hash1 = hashData(data1);
            const hash2 = hashData(data2);
            return hash1 !== hash2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce 64 character hex string (SHA-256)', () => {
      fc.assert(
        fc.property(fc.string(), (data) => {
          const hash = hashData(data);
          return hash.length === 64 && /^[0-9a-f]+$/.test(hash);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('sensitive data patterns', () => {
    it('should encrypt phone numbers correctly', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '+', ' ', '(', ')'), { minLength: 10, maxLength: 20 }),
          (phone) => {
            const encrypted = encryptField(phone);
            const decrypted = decryptField(encrypted);
            return decrypted === phone;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should encrypt email addresses correctly', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const encrypted = encryptField(email);
          const decrypted = decryptField(encrypted);
          return decrypted === email;
        }),
        { numRuns: 100 }
      );
    });

    it('should encrypt JSON objects correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string(),
            value: fc.integer(),
            active: fc.boolean(),
          }),
          (obj) => {
            const jsonStr = JSON.stringify(obj);
            const encrypted = encryptField(jsonStr);
            const decrypted = decryptField(encrypted);
            return decrypted === jsonStr;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
