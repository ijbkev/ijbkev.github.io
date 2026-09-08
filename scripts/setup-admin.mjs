import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

export function setupAdmin() {
  if (existsSync('.local/server.env')) return;
  mkdirSync('.local', { recursive: true, mode: 0o700 });
  const password = randomBytes(24).toString('base64url');
  const salt = randomUUID();
  const hash = `${salt}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
  writeFileSync('.local/server.env', `ADMIN_PASSWORD_HASH="${hash}"\nAPP_ORIGIN="http://localhost:8080"\n`, { mode: 0o600 });
  writeFileSync('.local/admin-credentials.txt', `IJBK administrator access\n\nAdministrator dashboard: https://ijbk-ev.hsg.rptu.de/admin/reimbursements\nLocal dashboard: http://localhost:8080/admin/reimbursements\nPassword: ${password}\n\nPrivate local file. Do not commit or share with participants.\nProject access codes are configured separately in the dashboard.\n`, { mode: 0o600 });
  console.log('Local administrator access configured. Password saved in .local/admin-credentials.txt.');
}
setupAdmin();
