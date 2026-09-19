import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { hashPassword } from './helpers/auth';

// Minimal test authenticator: real P-256 key, COSE public key and signed assertions.
function cbor(value: unknown): Buffer {
  function header(major: number, n: number) {
    if (n < 24) return Buffer.from([major * 32 + n]);
    if (n < 256) return Buffer.from([major * 32 + 24, n]);
    const b = Buffer.alloc(3); b[0] = major * 32 + 25; b.writeUInt16BE(n, 1); return b;
  }
  if (Buffer.isBuffer(value)) return Buffer.concat([header(2, value.length), value]);
  if (typeof value === 'string') { const b = Buffer.from(value); return Buffer.concat([header(3, b.length), b]); }
  if (typeof value === 'number') return header(value < 0 ? 1 : 0, value < 0 ? -1 - value : value);
  if (value instanceof Map) return Buffer.concat([header(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  throw new Error('Unsupported test CBOR value');
}
const b64 = (b: Buffer) => b.toString('base64url');
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest();

test('admin passkeys: real registration/signatures, session reuse, replay/origin/UV guards and revocation', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ijbk-passkeys-'));
  const server = createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port; await new Promise<void>(r => server.close(() => r()));
  const origin = `http://localhost:${port}`;
  const password = 'passkey-test-admin';
  await mkdir(path.join(dir, 'secret-friend'));
  await writeFile(path.join(dir, 'secret-friend/store.json'), JSON.stringify({ admin: hashPassword(password), projects: {}, limits: {} }));
  await writeFile(path.join(dir, 'hash'), hashPassword(password));
  await writeFile(path.join(dir, 'router.php'), `<?php define('IJBK_ADMIN_PASSWORD_HASH',trim(file_get_contents('${dir}/hash'))); if(str_starts_with($_SERVER['REQUEST_URI'],'/secret-friend/')){$_SERVER['SCRIPT_NAME']='/secret-friend/api.php';require '${path.resolve('public/secret-friend/api.php')}';return;} require '${path.resolve('php-api/index.php')}';`);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, path.join(dir, 'router.php')], { env: { ...process.env, IJBK_STORAGE_DIR: dir }, stdio: 'ignore' });
  const cookies = new Map<string, string>();
  async function req(route: string, body?: unknown, options: { cookie?: string; method?: string; origin?: string } = {}) {
    const response = await fetch(`${origin}/api${route}`, { method: options.method ?? 'POST', headers: { Host: `localhost:${port}`, Origin: options.origin ?? origin, Cookie: options.cookie ?? [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of response.headers.getSetCookie()) { const [k, v] = c.split(';')[0].split('='); cookies.set(k, v); }
    return response;
  }
  async function sf(action: string, body?: unknown, csrf = '') {
    const response = await fetch(`${origin}/secret-friend/api.php?action=${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of response.headers.getSetCookie()) { const [k, v] = c.split(';')[0].split('='); cookies.set(k, v); }
    return response;
  }
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const key = cbor(new Map<unknown, unknown>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, 'base64url')], [-3, Buffer.from(jwk.y!, 'base64url')]]));
  const id = randomBytes(32);
  function registration(challenge: string, flags = 0x45) {
    const length = Buffer.alloc(2); length.writeUInt16BE(id.length);
    const authData = Buffer.concat([sha('localhost'), Buffer.from([flags]), Buffer.alloc(4), Buffer.alloc(16), length, id, key]);
    return { id: b64(id), type: 'public-key', clientDataJSON: b64(Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge, origin, crossOrigin: false }))), attestationObject: b64(cbor(new Map<unknown, unknown>([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]))) };
  }
  function assertion(challenge: string, changes: { origin?: string; flags?: number; rp?: string; challenge?: string; counter?: number } = {}) {
    const client = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: changes.challenge ?? challenge, origin: changes.origin ?? origin, crossOrigin: false }));
    const counter = Buffer.alloc(4); counter.writeUInt32BE(changes.counter ?? 0);
    const auth = Buffer.concat([sha(changes.rp ?? 'localhost'), Buffer.from([changes.flags ?? 5]), counter]);
    return { id: b64(id), type: 'public-key', clientDataJSON: b64(client), authenticatorData: b64(auth), signature: b64(sign('sha256', Buffer.concat([auth, sha(client)]), privateKey)), userHandle: b64(sha('IJBK administrator')) };
  }
  async function loginOptions() { const response = await req('/admin/passkeys/login/options'); assert.equal(response.status, 200); return (await response.json()).publicKey; }
  try {
    for (let n = 0; n < 60; n++) { try { await req('/admin/session', undefined, { method: 'GET' }); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    assert.equal((await req('/admin/passkeys/register/options', { password, label: 'Test Mac' }, { cookie: '' })).status, 401);
    assert.equal((await req('/admin/passkeys', undefined, { method: 'GET', cookie: '' })).status, 401);
    assert.equal((await req('/admin/passkeys/remove', { id: b64(id), password }, { cookie: '' })).status, 401);
    assert.equal((await req('/admin/login', { password })).status, 200);
    assert.equal((await req('/admin/passkeys/register/options', { password: 'wrong', label: 'Test' })).status, 401);
    let response = await req('/admin/passkeys/register/options', { password, label: 'Test Mac' });
    const options = (await response.json()).publicKey;
    assert.equal(options.authenticatorSelection.userVerification, 'required');
    assert.equal(options.authenticatorSelection.residentKey, 'required');
    assert.equal(options.attestation, 'none');
    const registrationCookie = cookies.get('ijbk_passkey_register')!;
    assert.equal((await req('/admin/passkeys/register/verify', registration(options.challenge), { cookie: `ijbk_passkey_register=${registrationCookie}` })).status, 401, 'registration still requires an administrator session');
    assert.equal((await req('/admin/passkeys/register/verify', registration(options.challenge, 0x41))).status, 401, 'registration requires user verification');
    response = await req('/admin/passkeys/register/options', { password, label: 'Test Mac' });
    const registrationOptions = (await response.json()).publicKey;
    response = await req('/admin/passkeys/register/verify', registration(registrationOptions.challenge));
    assert.equal(response.status, 200, await response.text());
    assert.equal((await req('/admin/passkeys/register/verify', registration(registrationOptions.challenge))).status, 401, 'registration is single use');
    const list = await (await req('/admin/passkeys', undefined, { method: 'GET' })).json();
    assert.equal(list.passkeys[0].label, 'Test Mac'); assert.equal(list.passkeys[0].public_key, undefined);
    await req('/admin/logout');
    for (const changes of [{ origin: `http://evil.localhost:${port}` }, { flags: 1 }, { rp: 'other.test' }, { challenge: b64(randomBytes(32)) }]) {
      const o = await loginOptions(); assert.equal(o.userVerification, 'required'); assert.equal(o.allowCredentials, undefined);
      assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge, changes))).status, 401);
    }
    let o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', { ...assertion(o.challenge), userHandle: b64(randomBytes(32)) })).status, 401);
    o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', { ...assertion(o.challenge), signature: b64(randomBytes(72)) })).status, 401);
    o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge), { cookie: '' })).status, 401, 'challenge bound to requesting browser');
    o = await loginOptions();
    execFileSync('php', ['-r', `require $argv[1]; db()->exec('UPDATE admin_passkey_challenges SET expires_at=0');`, path.resolve('php-api/lib.php')], { env: { ...process.env, IJBK_STORAGE_DIR: dir } });
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge))).status, 401, 'expired challenge');
    o = await loginOptions();
    const payload = assertion(o.challenge);
    response = await req('/admin/passkeys/login/verify', payload); assert.equal(response.status, 200, await response.text());
    assert.equal((await req('/admin/session', undefined, { method: 'GET' })).status, 200);
    assert.equal((await req('/admin/planner', undefined, { method: 'GET' })).status, 200);
    assert.ok(cookies.get('ijbk_site_admin'), 'passkey creates a site-wide session');
    let sfState = await (await sf('state')).json();
    assert.equal(sfState.siteAuth, true); assert.equal(sfState.admin, true);
    assert.equal((await sf('admin_data')).status, 200, 'registered passkey grants Secret Friend admin access');
    await req('/admin/logout');
    assert.equal((await sf('admin_data')).status, 401, 'main logout also locks Secret Friend');
    o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge))).status, 200);
    sfState = await (await sf('state')).json();
    assert.equal((await sf('logout', {}, sfState.csrf)).status, 200);
    assert.equal((await req('/admin/session', undefined, { method: 'GET' })).status, 401, 'Secret Friend logout invalidates shared admin session');
    sfState = await (await sf('state')).json();
    assert.equal((await sf('login', { password }, sfState.csrf)).status, 200);
    assert.equal((await req('/admin/session', undefined, { method: 'GET' })).status, 200, 'main admin password entered in Secret Friend signs in site-wide');

    assert.equal((await req('/admin/passkeys/login/verify', payload)).status, 401, 'login is single use');
    o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge, { counter: 2 }))).status, 200);
    o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge, { counter: 1 }))).status, 401, 'reject decreasing authenticator counters');

    assert.equal((await req('/admin/passkeys/remove', { id: b64(id), password }, { origin: 'https://outsider.test' })).status, 403);
    assert.equal((await req('/admin/passkeys/remove', { id: b64(id), password: 'wrong' })).status, 401);
    await writeFile(path.join(dir, 'hash'), hashPassword('rotated-admin-password'));
    o = await loginOptions(); assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge))).status, 401, 'password rotation revokes old credentials');
    assert.equal((await req('/admin/passkeys/remove', { id: b64(id), password: 'rotated-admin-password' })).status, 200);
    await req('/admin/logout'); o = await loginOptions();
    assert.equal((await req('/admin/passkeys/login/verify', assertion(o.challenge))).status, 401);
    assert.equal((await req('/admin/login', { password: 'rotated-admin-password' })).status, 200, 'password fallback still works');
  } finally { child.kill(); await new Promise<void>(r => child.once('exit', () => r())); await rm(dir, { recursive: true, force: true }); }
});
