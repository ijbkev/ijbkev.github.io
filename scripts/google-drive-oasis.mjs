// Local Oasis API pilot. Credentials and participant mappings stay in ignored .local/.
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const root = new URL('../.local/drive-oasis/', import.meta.url);
await mkdir(root, { recursive: true, mode: 0o700 });
const mode = process.argv[2];
const credentialsPath = process.argv[3];
if (!['auth', 'preview', 'sync'].includes(mode) || !credentialsPath) {
  console.error('Usage: node scripts/google-drive-oasis.mjs auth|preview|sync /path/to/client.json');
  process.exit(1);
}
const client = JSON.parse(await readFile(credentialsPath, 'utf8')).installed;
if (!client?.client_id || !client?.client_secret) throw new Error('Desktop OAuth credentials required.');
const save = (name, data) => writeFile(new URL(name, root), JSON.stringify(data, null, 2), { mode: 0o600 });
async function tokenRequest(values) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ ...values, client_id: client.client_id, client_secret: client.client_secret }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google authorization failed: ${data.error || response.status}`);
  return data;
}
if (mode === 'auth') {
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(48).toString('base64url');
  let redirect;
  let processing = false;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, redirect);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (url.pathname !== '/callback' || url.searchParams.get('state') !== state) {
      res.writeHead(400); res.end('Invalid authorization callback.'); return;
    }
    if (processing) { res.writeHead(409); res.end('Authorization already processing.'); return; }
    processing = true;
    try {
      if (!url.searchParams.get('code') || url.searchParams.has('error')) throw new Error('Authorization was not granted.');
      const tokens = await tokenRequest({ code: url.searchParams.get('code'), code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' });
      if (!tokens.refresh_token) throw new Error('No refresh token returned; authorize again.');
      await save('tokens.json', tokens);
      res.end('Google Drive connected. Return to Codex to continue the Oasis sample.');
      console.log('Google Drive authorization saved securely. No folders changed by this command.');
    } catch (error) { res.writeHead(400); res.end(error.message); console.error(error.message); process.exitCode = 1; }
    finally { clearTimeout(expiry); server.close(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  redirect = `http://127.0.0.1:${server.address().port}/callback`;
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive', access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  await writeFile(new URL('authorize-url.txt', root), authorization.href, { mode: 0o600 });
  console.log(`Authorize Google Drive: ${authorization.href}`);
  const expiry = setTimeout(() => { console.error('Authorization expired. Run auth again.'); server.close(); }, 30 * 60 * 1000);
} else {
  const lockPath = new URL('sync.lock', root);
  const lock = await open(lockPath, 'wx', 0o600).catch(() => { throw new Error('Another run holds sync.lock. Do not run simultaneous syncs.'); });
  try {
    const stored = JSON.parse(await readFile(new URL('tokens.json', root), 'utf8'));
    const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: stored.refresh_token });
    async function api(path, query = {}, body, method = 'POST') {
      const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
      url.search = new URLSearchParams(query).toString();
      const response = await fetch(url, { method: body ? method : 'GET', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(`Drive API ${response.status}: ${data.error?.message || 'Request failed'}`);
      return data;
    }
    const quote = value => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    async function children(parent) {
      const result = []; let pageToken;
      do {
        const page = await api('files', { q: `'${quote(parent)}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`, fields: 'nextPageToken,files(id,name,parents,appProperties)', pageSize: '1000', ...(pageToken ? { pageToken } : {}) });
        result.push(...page.files); pageToken = page.nextPageToken;
      } while (pageToken);
      return result;
    }
    async function permissions(id) {
      const result = []; let pageToken;
      do {
        const page = await api(`files/${id}/permissions`, { fields: 'nextPageToken,permissions(id,type,emailAddress,role)', pageSize: '100', ...(pageToken ? { pageToken } : {}) });
        result.push(...page.permissions); pageToken = page.nextPageToken;
      } while (pageToken);
      return result;
    }
    const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    function unique(folders, name) {
      const matches = folders.filter(f => same(f.name, name));
      if (matches.length > 1) throw new Error(`Ambiguous duplicate folder: ${name}. Nothing will be overwritten.`);
      return matches[0];
    }
    const parent = '1bF69p2pwg7TlFktT9008V4p8UhAbVjKu';
    const oasis = await api(`files/${parent}`, { fields: 'id,name,mimeType,capabilities(canAddChildren)' });
    if (oasis.mimeType !== 'application/vnd.google-apps.folder' || !oasis.capabilities?.canAddChildren) throw new Error('Oasis folder is not writable.');
    const countries = unique(await children(parent), 'Countries');
    if (!countries) throw new Error('Existing Countries folder not found.');
    const tunisia = unique(await children(countries.id), 'Tunisia');
    if (!tunisia) throw new Error('Existing Tunisia folder not found.');
    const people = [{ name: 'Mokhtar', email: 'mokhtaraloulou74@gmail.com' }, { name: 'Youssef', email: 'youssefkammounprof@gmail.com' }];
    const ancestorPermissions = await permissions(tunisia.id);
    if (ancestorPermissions.some(p => p.type === 'anyone' || p.type === 'domain' || people.some(person => same(p.emailAddress || '', person.email)))) throw new Error('Tunisia already grants broad or participant access. Review inherited permissions before proceeding.');
    const folders = await children(tunisia.id);
    const planned = [];
    for (const person of people) {
      const key = createHash('sha256').update(`oasis|tunisia|${person.email}`).digest('hex');
      const tagged = folders.filter(f => f.appProperties?.ijbkParticipant === key);
      if (tagged.length > 1) throw new Error(`Duplicate participant identity for ${person.name}.`);
      const folder = tagged[0] || unique(folders, person.name);
      if (folder?.appProperties?.ijbkParticipant && folder.appProperties.ijbkParticipant !== key) throw new Error(`${person.name} belongs to a different participant.`);
      const existingPermissions = folder ? await permissions(folder.id) : [];
      if (existingPermissions.some(p => p.type === 'anyone' || p.type === 'domain' || (p.type === 'user' && p.role !== 'owner' && !same(p.emailAddress || '', person.email) && !ancestorPermissions.some(a => a.id === p.id)))) throw new Error(`Review existing access on ${person.name}; refusing to expose another person's folder.`);
      // Only adopt an untagged empty folder (including the empty Mokhtar pilot folder).
      if (folder && !folder.appProperties?.ijbkParticipant && !existingPermissions.some(p => same(p.emailAddress || '', person.email))) {
        const contents = await api('files', { q: `'${quote(folder.id)}' in parents and trashed = false`, fields: 'files(id)', pageSize: '1' });
        if (contents.files.length) throw new Error(`Cannot safely identify populated folder ${person.name}.`);
      }
      planned.push({ person, key, folder, existingPermissions });
    }
    console.log(`Oasis / Countries / Tunisia: ${mode}`);
    for (const { person, key, folder, existingPermissions } of planned) {
      if (mode === 'preview') { console.log(`${folder ? 'Reuse' : 'Create'} ${person.name}; grant ${person.email} editor access on this folder only.`); continue; }
      const target = folder || await api('files', { fields: 'id,name' }, { name: person.name, mimeType: 'application/vnd.google-apps.folder', parents: [tunisia.id], appProperties: { ijbkParticipant: key } });
      if (folder && folder.appProperties?.ijbkParticipant !== key) await api(`files/${target.id}`, { fields: 'id' }, { appProperties: { ijbkParticipant: key } }, 'PATCH');
      const permission = existingPermissions.find(p => p.type === 'user' && same(p.emailAddress || '', person.email));
      if (!permission) await api(`files/${target.id}/permissions`, { sendNotificationEmail: 'false', fields: 'id' }, { type: 'user', role: 'writer', emailAddress: person.email });
      else if (!['writer', 'owner'].includes(permission.role)) await api(`files/${target.id}/permissions/${permission.id}`, { fields: 'id' }, { role: 'writer' }, 'PATCH');
      const verified = await permissions(target.id);
      if (!verified.some(p => same(p.emailAddress || '', person.email) && ['writer', 'owner'].includes(p.role))) throw new Error(`Could not verify access for ${person.name}.`);
      console.log(`${person.name}: verified editor access — https://drive.google.com/drive/folders/${target.id}`);
      await save(`${key}.json`, { project: 'oasis', country: 'Tunisia', ...person, folderId: target.id });
    }
  } finally { await lock.close(); await unlink(lockPath); }
}
