import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import './setup-admin.mjs';

export function startPhp({ preview = false } = {}) {
  const check = spawnSync('php', ['-r', `foreach (['pdo_sqlite','mbstring','fileinfo','gd','openssl'] as $ext) if (!extension_loaded($ext)) {fwrite(STDERR, "Missing PHP extension: $ext\\n"); exit(1);}`], { stdio: 'inherit' });
  if (check.error || check.status !== 0) throw new Error('PHP with SQLite, mbstring, fileinfo and GD is required.');
  if (preview && !existsSync('dist/api/index.php')) throw new Error('Run npm run build before npm run preview.');
  const storage = path.resolve('.local/demo-reimbursement'); mkdirSync(storage, { recursive: true, mode: 0o700 });
  const ini = readFileSync('php-api/.user.ini', 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith(';')).flatMap(s => ['-d', s]);
  const address = preview ? '127.0.0.1:4173' : '127.0.0.1:8787';
  const child = spawn('php', [...ini, '-S', address, '-t', preview ? 'dist' : 'public', 'scripts/php-router.php'], {
    stdio: 'inherit', env: { ...process.env, IJBK_STORAGE_DIR: storage, IJBK_DEMO: '1', IJBK_GOOGLE_DRIVE_CREDENTIALS: '', GOOGLE_DRIVE_CLIENT_ID: '', GOOGLE_DRIVE_CLIENT_SECRET: '', GOOGLE_DRIVE_REFRESH_TOKEN: '', IJBK_PREVIEW: preview ? '1' : '0' },
  });
  child.once('spawn', () => console.log(`PHP ${preview ? 'preview' : 'API'}: http://${address}`));
  return child;
}
