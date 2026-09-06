import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFArray, PDFDict, PDFName, PDFDocument } from 'pdf-lib';
import { hashPassword } from '../server/auth';

test('Apache/PHP country caps, approvals, snapshots, PDF and deletion', { timeout: 60000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ijbk-php-test-'));
  const server = createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port; await new Promise<void>(r => server.close(() => r()));
  const base = `http://127.0.0.1:${port}`;
  const apiPath = path.resolve('php-api');
  const password = 'test-admin-secret';
  // Load source directly with a synthetic administrator and isolated storage.
  await writeFile(path.join(dir, 'router.php'), `<?php define('IJBK_ADMIN_PASSWORD_HASH', '${await hashPassword(password)}'); require '${apiPath}/lib.php'; require '${apiPath}/pdf.php'; $source=file_get_contents('${apiPath}/index.php'); $source=str_replace("require_once __DIR__ . '/bootstrap.php';", '', $source); $source=str_replace("__DIR__ . '/lib.php'", "'${apiPath}/lib.php'", $source); $source=str_replace("__DIR__ . '/pdf.php'", "'${apiPath}/pdf.php'", $source); eval(substr($source,5));`);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, path.join(dir, 'router.php')], { env: { ...process.env, IJBK_STORAGE_DIR: dir }, stdio: ['ignore', 'ignore', 'pipe'] });
  let log = ''; child.stderr.on('data', data => { log += data.toString(); });
  try {
    for (let n = 0; n < 60; n++) { try { await fetch(`${base}/api/projects/oasis`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    async function req(route: string, method = 'GET', body?: unknown, cookie = '') {
      return fetch(`${base}/api${route}`, { method, headers: { Origin: base, Cookie: cookie, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    }
    let response = await req('/admin/login', 'POST', { password }); assert.equal(response.status, 200, log);
    const admin = response.headers.get('set-cookie')!.split(';')[0];
    const settings = { projectCode: 'TEST-2026', shortName: 'OASIS', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countryLimits: { Germany: 30900 }, countries: ['Germany'], enabled: true, accessCode: 'participant-test-code' };
    response = await req('/admin/projects/oasis', 'PUT', settings, admin); assert.equal(response.status, 200, await response.text());
    assert.equal((await (await req('/projects/oasis')).json()).countryLimits.Germany, 30900);
    response = await req('/projects/oasis/unlock', 'POST', { code: settings.accessCode }); const participantCookie = response.headers.get('set-cookie')!.split(';')[0];
    const participant = { firstName: 'Tugay', lastName: 'Özkan', citizenship: 'Turkish', team: 'Germany', residenceCountry: 'Germany', city: 'Berlin', role: 'Facilitator', arrivalDate: '2026-09-20', departureDate: '2026-09-27', dateOfBirth: '2000-03-22', email: 'participant@example.test', phone: '+49 123456789', address: 'Example Street 12', accountHolder: 'Tugay Özkan', bankName: 'Test Bank', bankAccount: 'DE89370400440532013000', bic: 'COBADEFFXXX', bankAddress: 'Berlin', signaturePlace: 'Berlin', notes: 'Test notes', sendingOrganisation: 'Test youth organisation', greenTravel: true };
    const claim = { requestId: crypto.randomUUID(), participant, declaration: true, signature: `data:image/png;base64,${(await readFile('tests/fixtures/signature.png')).toString('base64')}`, tickets: [{ purchaseDate: '2026-09-04', travelDate: '2026-09-20', from: 'Berlin', to: 'Vienna', mode: 'Train', ticketType: 'Paper ticket', currency: 'EUR', amount: 349 }], extraCents: 90000, countryLimitCents: 90000, destinationCity: 'Forged destination' };
    function form(input = claim) { const f = new FormData(); f.append('claim', JSON.stringify(input)); f.append('ticket-0', new Blob([ticket], { type: 'image/jpeg' }), 'train.jpg'); return f; }
    const ticket = await readFile('tests/fixtures/ticket.jpg');
    response = await req('/projects/oasis/submissions', 'POST', form(), participantCookie); const receipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(receipt) + log); assert.equal(receipt.finalCents, 30900); assert.match(receipt.reference, /^OASIS_DE_TUGAY_ÖZKAN_\d{4}_\d{2}_\d{2}$/);
    response = await req('/projects/oasis/submissions', 'POST', form(), participantCookie); assert.equal((await response.json()).reference, receipt.reference);
    const id = receipt.id;
    assert.equal((await req(`/admin/submissions/${id}/pdf-tickets`, 'GET', undefined, participantCookie)).status, 401);
    const manifest = await (await req(`/admin/submissions/${id}/pdf-tickets`, 'GET', undefined, admin)).json();
    assert.equal(manifest.tickets.length, 0); assert.equal(manifest.skippedImages, 1);
    assert.equal((await req(`/admin/submissions/${id}/tickets/1`, 'GET', undefined, admin)).status, 415);
    assert.equal((await req(`/admin/submissions/${id}`, 'DELETE', undefined, participantCookie)).status, 401);
    assert.equal((await req(`/admin/submissions/${id}/extra`, 'PUT', { extraCents: 4000 }, participantCookie)).status, 401);
    response = await req(`/admin/submissions/${id}/extra`, 'PUT', { extraCents: -1 }, admin); assert.equal(response.status, 422);
    response = await req(`/admin/submissions/${id}/extra`, 'PUT', { extraCents: 4000, note: 'Approved additional support' }, admin); assert.equal(response.status, 200, await response.text());
    const saved = await (await req(`/admin/submissions/${id}`, 'GET', undefined, admin)).json(); assert.equal(saved.extraCents, 4000); assert.equal(saved.destinationCity, 'Vienna');
    const list = await (await req('/admin/projects/oasis/submissions', 'GET', undefined, admin)).json(); assert.equal(list[0].finalCents, 34900);
    response = await req(`/admin/submissions/${id}/pdf`, 'GET', undefined, admin); assert.equal(response.status, 200, log); assert.match(response.headers.get('content-disposition')!, /Tugay%20%C3%96zkan%20-%20Germany.pdf/);
    const bytes = new Uint8Array(await response.arrayBuffer()); const pdf = await PDFDocument.load(bytes); assert.equal(pdf.getTitle(), 'Reimbursement Declaration - Tugay Özkan - Germany'); assert.ok(pdf.getPageCount() >= 3);
    const destinations = pdf.getPages().flatMap(page => {
      const annotations = page.node.Annots();
      return annotations ? annotations.asArray().flatMap(ref => {
        const annotation = pdf.context.lookup(ref, PDFDict);
        if (annotation.get(PDFName.of('Subtype'))?.toString() !== '/Link') return [];
        const destination = annotation.lookupMaybe(PDFName.of('Dest'), PDFArray);
        return destination ? [destination.get(0).toString()] : [];
      }) : [];
    });
    assert.deepEqual(destinations, pdf.getPages().slice(-1).map(page => page.ref.toString()), 'each attachment link targets its ticket page');
    await mkdir('tmp/pdfs', { recursive: true }); await writeFile('tmp/pdfs/reimbursement-php-qa.pdf', bytes);
    await req('/admin/projects/oasis', 'PUT', { ...settings, countryLimits: { Germany: 20000 }, destinationCity: 'Paris' }, admin);
    const snapshot = await (await req(`/admin/submissions/${id}`, 'GET', undefined, admin)).json(); assert.equal(snapshot.countryLimitCents, 30900); assert.equal(snapshot.destinationCity, 'Vienna');
    response = await req(`/admin/submissions/${id}/extra`, 'PUT', { extraCents: 0, note: '' }, admin); assert.equal(response.status, 200);
    assert.equal((await (await req('/admin/projects/oasis/submissions', 'GET', undefined, admin)).json())[0].finalCents, 30900);
    response = await req(`/admin/submissions/${id}`, 'DELETE', undefined, admin); assert.equal(response.status, 200);
    assert.equal((await req(`/admin/submissions/${id}/pdf`, 'GET', undefined, admin)).status, 404);
    assert.equal((await (await req('/admin/projects/oasis/submissions', 'GET', undefined, admin)).json()).length, 0);
    assert.ok(!log.includes('PHP Warning'), log);
  } finally { child.kill(); await new Promise<void>(r => child.once('exit', () => r())); await rm(dir, { recursive: true, force: true }); }
});
