import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import type { Env, Variables } from './types';

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;
const encode = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
export const sha256 = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encode.encode(value)));
export async function hashPassword(password: string, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', encode.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: encode.encode(salt) }, key, 256);
  return `${salt}:${hex(result)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const actual = await hashPassword(password, stored.split(':')[0]);
  if (actual.length !== stored.length) return false;
  let difference = 0;
  for (let i = 0; i < stored.length; i++) difference |= actual.charCodeAt(i) ^ stored.charCodeAt(i);
  return difference === 0;
}
const cookieName = (projectId?: string, role: 'admin' | 'participant' | 'organisation' = projectId ? 'participant' : 'admin') => projectId ? `ijbk_${role}_project_${projectId}` : 'ijbk_admin';
export async function newSession(c: Ctx, role: 'admin' | 'participant' | 'organisation', projectId?: string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, role, project_id, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), role, projectId ?? null, Date.now() + 8 * 3600000).run();
  setCookie(c, cookieName(projectId, role), token, { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Strict', path: '/api', maxAge: 8 * 3600 });
}
export async function requireSession(c: Ctx, projectId?: string, role: 'participant' | 'organisation' = 'participant') {
  const expectedRole = projectId ? role : 'admin';
  const token = getCookie(c, cookieName(projectId, expectedRole));
  if (!token) throw new HTTPException(401, { message: projectId ? 'Enter the project access code to continue.' : 'Administrator sign-in required.' });
  const hash = await sha256(token);
  const session = await c.env.DB.prepare('SELECT role, project_id, expires_at FROM sessions WHERE token_hash = ?').bind(hash).first<{ role: string; project_id: string | null; expires_at: number }>();
  if (!session || session.expires_at < Date.now() || session.role !== expectedRole || session.project_id !== (projectId ?? null)) throw new HTTPException(401, { message: 'Your session expired. Sign in again; your form is still here.' });
  c.set('sessionHash', hash);
  return hash;
}
export async function rateLimit(c: Ctx, scope: string, limit: number, seconds = 900) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = await sha256(`${scope}:${c.req.header('cf-connecting-ip') ?? 'local'}:${bucket}`);
  const row = await c.env.DB.prepare('INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count')
    .bind(key, (bucket + 1) * seconds * 1000).first<{ count: number }>();
  if (row && row.count > limit) throw new HTTPException(429, { message: 'Too many attempts. Please wait 15 minutes and try again.' });
}
