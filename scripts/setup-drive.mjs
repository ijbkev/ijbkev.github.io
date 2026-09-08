// Import the organizer's existing desktop OAuth connection for local development.
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
const [clientPath, tokenPath] = process.argv.slice(2);
if (!clientPath || !tokenPath) throw new Error('Usage: node scripts/setup-drive.mjs client.json tokens.json');
const source = JSON.parse(await readFile(clientPath, 'utf8'));
const client = source.installed ?? source.web;
const tokens = JSON.parse(await readFile(tokenPath, 'utf8'));
if (!client?.client_id || !client?.client_secret || !tokens.refresh_token) throw new Error('Authorized Google OAuth credentials are required.');
const credentials = { client_id: client.client_id, client_secret: client.client_secret, refresh_token: tokens.refresh_token };
await mkdir('.local', { recursive: true, mode: 0o700 });
await writeFile('.local/google-drive.json', JSON.stringify(credentials), { mode: 0o600 });
await chmod('.local/google-drive.json', 0o600);
console.log('Google Drive connection configured locally. Credentials were not copied into website assets.');
