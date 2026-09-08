import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, access, rm } from 'node:fs/promises';

await build({ entryPoints: ['server/index.ts'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, loader: { '.png': 'binary', '.ttf': 'binary', '.sql': 'text' } });
await rm('dist/api', { recursive: true, force: true });
await cp('php-api', 'dist/api', { recursive: true });
await cp('shared/countries.json', 'dist/api/countries.json');
await cp('server/drive-defaults.json', 'dist/api/drive-defaults.json');
await mkdir('dist/api/assets', { recursive: true });
await cp('public/reimbursement/eu-logo.png', 'dist/api/assets/eu-logo.png');
await cp('public/logo.png', 'dist/api/assets/ngo-logo.png');
await cp('public/reimbursement/erasmus-logo.png', 'dist/api/assets/erasmus-logo.png');
await cp('public/reimbursement/coordinator-signature.png', 'dist/api/assets/coordinator-signature.png');
const secrets = await readFile('.dev.vars', 'utf8');
const hash = secrets.match(/^ADMIN_PASSWORD_HASH="([^"]+)"/m)?.[1];
if (!hash) throw new Error('Missing ADMIN_PASSWORD_HASH. Run npm run setup:admin.');
const bootstrap = (await readFile('php-api/bootstrap.template.php', 'utf8')).replace('__ADMIN_PASSWORD_HASH__', hash.replaceAll("'", "\\'"));
await writeFile('dist/api/bootstrap.php', bootstrap, { mode: 0o600 });
await rm('dist/api/bootstrap.template.php');
// Sites expects static assets beside its server bundle in dist/client. Keep the
// original Vite dist root usable for the existing Apache frontend deployment.
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${folder}`, `dist/pdfjs/${folder}`, { recursive: true });
await mkdir('dist/client', { recursive: true });
const { readdir } = await import('node:fs/promises');
for (const item of await readdir('dist', { withFileTypes: true })) {
  // The PHP API contains its server-side bootstrap hash and must never be
  // copied into the static Sites asset directory.
  if (['server', 'client', '.openai', 'api'].includes(item.name)) continue;
  await cp(`dist/${item.name}`, `dist/client/${item.name}`, { recursive: true });
}
await mkdir('dist/.openai/drizzle', { recursive: true });
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
try { await access('.openai/hosting.json'); await cp('.openai/hosting.json', 'dist/.openai/hosting.json'); } catch { /* Local build before a Site has been created. */ }
console.log('Reimbursement server, static website, and migrations built.');
