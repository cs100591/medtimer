import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = config.encryption.algorithm;
const KEY = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

export const encrypt = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv) as crypto.CipherGCM;
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex'),
  };
};

export const decrypt = (encryptedObj: EncryptedData): string => {
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const authTag = Buffer.from(encryptedObj.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv) as crypto.DecipherGCM;
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

export const encryptField = (value: string): string => {
  const encrypted = encrypt(value);
  return JSON.stringify(encrypted);
};

export const decryptField = (encryptedValue: string): string => {
  const encrypted: EncryptedData = JSON.parse(encryptedValue);
  return decrypt(encrypted);
};

export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};
