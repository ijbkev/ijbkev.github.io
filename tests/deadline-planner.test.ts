import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hashPassword } from './helpers/auth';
import { daysUntil, quadrant, deadlineLabel, type PlannerTask } from '../shared/deadline-planner';

const task: PlannerTask = { id: '11111111-1111-4111-8111-111111111111', title: 'Prepare workshop', deadline: '2026-09-15', important: true, urgency: 'auto', notes: '', completed: false };
test('matrix follows calendar deadlines, importance and manual overrides', () => {
  const today = new Date(2026, 8, 12, 23, 59);
  assert.equal(daysUntil(task.deadline, today), 3);
  assert.equal(quadrant(task, 2, today), 1);
  assert.equal(quadrant(task, 3, today), 0);
  assert.equal(quadrant({ ...task, important: false }, 3, today), 2);
  assert.equal(quadrant({ ...task, important: false }, 2, today), 3);
  assert.equal(quadrant({ ...task, urgency: 'urgent' }, 0, today), 0);
  assert.equal(quadrant({ ...task, deadline: '2026-09-01', urgency: 'not-urgent' }, 2, today), 1);
  assert.equal(deadlineLabel('2026-09-12', today), 'Due today');
  assert.equal(deadlineLabel('2026-09-11', today), '1 day overdue');
  assert.equal(daysUntil('2026-03-30', new Date(2026, 2, 28, 23)), 2);
});

test('planner uses main admin login, persists tasks, validates input and blocks unauthorized changes', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ijbk-planner-'));
  const listener = createServer(); await new Promise<void>(r => listener.listen(0, '127.0.0.1', r));
  const port = (listener.address() as { port: number }).port; await new Promise<void>(r => listener.close(() => r()));
  const base = `http://127.0.0.1:${port}`;
  await writeFile(path.join(dir, 'router.php'), `<?php define('IJBK_ADMIN_PASSWORD_HASH','${hashPassword('planner-test-secret')}'); require '${path.resolve('php-api/index.php')}';`);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, path.join(dir, 'router.php')], { env: { ...process.env, IJBK_STORAGE_DIR: dir }, stdio: 'ignore' });
  async function req(route: string, method = 'GET', body?: unknown, cookie = '', origin = base) {
    return fetch(`${base}/api${route}`, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  try {
    for (let n = 0; n < 60; n++) { try { await req('/admin/planner'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const route = `/admin/planner/tasks/${task.id}`;
    for (const [url, method, body] of [['/admin/planner','GET',undefined], [route,'PUT',task], [route,'DELETE',undefined], ['/admin/planner/settings','PUT',{ urgencyDays: 5 }]] as const) assert.equal((await req(url, method, body)).status, 401);
    assert.equal((await req('/admin/login', 'POST', { password: 'wrong' })).status, 401);
    const login = await req('/admin/login', 'POST', { password: 'planner-test-secret' });
    assert.equal(login.status, 200); const cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await req('/admin/session', 'GET', undefined, cookie)).status, 200);
    // A real participant token cannot become an admin token by renaming its cookie.
    const participantToken = 'a'.repeat(96);
    execFileSync('php', ['-r', `require $argv[1]; db()->prepare('INSERT INTO sessions(token_hash,role,project_id,expires_at)VALUES(?,?,?,?)')->execute([hash('sha256',$argv[2]),'participant','oasis',time()+3600]);`, path.resolve('php-api/lib.php'), participantToken], { env: { ...process.env, IJBK_STORAGE_DIR: dir } });
    const forgedCookie = cookie.split('=')[0] + '=' + participantToken;
    assert.equal((await req('/admin/planner', 'GET', undefined, forgedCookie)).status, 401);
    assert.equal((await req(route, 'PUT', task, forgedCookie)).status, 401);

    assert.deepEqual(await (await req('/admin/planner', 'GET', undefined, cookie)).json(), { tasks: [], urgencyDays: 2 });
    assert.equal((await req(route, 'PUT', task, cookie, 'https://outsider.test')).status, 403);
    for (const invalid of [{ ...task, title: ' ' }, { ...task, deadline: '2026-02-30' }, { ...task, important: 'yes' }, { ...task, urgency: 'other' }, { ...task, notes: 'x'.repeat(5001) }]) assert.equal((await req(route, 'PUT', invalid, cookie)).status, 422);
    assert.equal((await req(route, 'PUT', task, cookie)).status, 200);
    assert.equal((await req(route, 'PUT', { ...task, completed: true }, cookie)).status, 200);
    assert.equal((await req('/admin/planner/settings', 'PUT', { urgencyDays: 5 }, cookie)).status, 200);
    assert.equal((await req('/admin/planner/settings', 'PUT', { urgencyDays: 31 }, cookie)).status, 422);
    assert.deepEqual(await (await req('/admin/planner', 'GET', undefined, cookie)).json(), { tasks: [{ ...task, completed: true }], urgencyDays: 5 });
    await req('/admin/logout', 'POST', undefined, cookie);
    assert.equal((await req('/admin/planner', 'GET', undefined, cookie)).status, 401);
    assert.equal((await req(route, 'DELETE', undefined, cookie)).status, 401);
    const second = await req('/admin/login', 'POST', { password: 'planner-test-secret' }); const secondCookie = second.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await (await req('/admin/planner', 'GET', undefined, secondCookie)).json()).tasks.length, 1);
    await req(route, 'DELETE', undefined, secondCookie);
    assert.deepEqual((await (await req('/admin/planner', 'GET', undefined, secondCookie)).json()).tasks, []);
  } finally { child.kill(); await new Promise<void>(r => child.once('exit', () => r())); await rm(dir, { recursive: true, force: true }); }
});
