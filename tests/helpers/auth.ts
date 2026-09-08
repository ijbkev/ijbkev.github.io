import { randomUUID, pbkdf2Sync } from 'node:crypto';
export function hashPassword(password: string, salt = randomUUID()) {
  return `${salt}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
}
