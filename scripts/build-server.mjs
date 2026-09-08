import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';

await rm('dist/api', { recursive: true, force: true });
await cp('php-api', 'dist/api', { recursive: true });
await cp('shared/countries.json', 'dist/api/countries.json');
await mkdir('dist/api/assets', { recursive: true });
await cp('public/reimbursement/eu-logo.png', 'dist/api/assets/eu-logo.png');
await cp('public/logo.png', 'dist/api/assets/ngo-logo.png');
await cp('public/reimbursement/erasmus-logo.png', 'dist/api/assets/erasmus-logo.png');
await cp('public/reimbursement/coordinator-signature.png', 'dist/api/assets/coordinator-signature.png');
const secrets = await readFile('.local/server.env', 'utf8');
const hash = secrets.match(/^ADMIN_PASSWORD_HASH="([^"]+)"/m)?.[1];
if (!hash) throw new Error('Missing ADMIN_PASSWORD_HASH. Run npm run setup:admin.');
const bootstrap = (await readFile('php-api/bootstrap.template.php', 'utf8')).replace('__ADMIN_PASSWORD_HASH__', hash.replaceAll("'", "\\'"));
await writeFile('dist/api/bootstrap.php', bootstrap, { mode: 0o600 });
await rm('dist/api/bootstrap.template.php');
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${folder}`, `dist/pdfjs/${folder}`, { recursive: true });
console.log('Apache/PHP website built.');
