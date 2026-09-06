import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFArray, PDFDict, PDFName, PDFDocument } from 'pdf-lib';
import { expandPdfObjects } from '../shared/pdf-compatibility';
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
    const settings = { projectCode: 'TEST-2026', shortName: 'OASIS', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countryLimits: { Germany: 30900 }, countries: ['Germany'], enabled: true, accessCode: 'participant-test-code', organisationAccessCode: 'organisation-test-code' };
    response = await req('/admin/projects/oasis', 'PUT', settings, admin); assert.equal(response.status, 200, await response.text());
    assert.equal((await (await req('/projects/oasis')).json()).countryLimits.Germany, 30900);
    response = await req('/projects/oasis/unlock', 'POST', { code: settings.accessCode }); const participantCookie = response.headers.get('set-cookie')!.split(';')[0];
    const participant = { firstName: 'Tugay', lastName: 'Özkan', citizenship: 'Turkish', team: 'Germany', residenceCountry: 'Germany', city: 'Berlin', role: 'Facilitator', arrivalDate: '2026-09-20', departureDate: '2026-09-27', dateOfBirth: '2000-03-22', email: 'participant@example.test', phone: '+49 123456789', address: 'Example Street 12', accountHolder: 'Tugay Özkan', bankName: 'Test Bank', bankAccount: 'DE89370400440532013000', bic: 'COBADEFFXXX', bankAddress: 'Berlin', signaturePlace: 'Berlin', notes: 'Test notes', sendingOrganisation: 'Test youth organisation', greenTravel: true };
    const claim = { requestId: crypto.randomUUID(), participant, declaration: true, signature: `data:image/png;base64,${(await readFile('tests/fixtures/signature.png')).toString('base64')}`, tickets: [{ purchaseDate: '2026-09-04', travelDate: '2026-09-20', from: 'Berlin', to: 'Vienna', mode: 'Train', ticketType: 'Paper ticket', currency: 'EUR', amount: 349 }], extraCents: 90000, countryLimitCents: 90000, destinationCity: 'Forged destination' };
    function form(input = claim, file: Uint8Array = ticket, type = 'image/jpeg', filename = 'train.jpg') { const f = new FormData(); f.append('claim', JSON.stringify(input)); f.append('ticket-0', new Blob([file], { type }), filename); return f; }
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
    assert.equal((await req('/projects/oasis/organisation-form?country=Germany', 'GET', undefined, participantCookie)).status, 401);
    response = await req('/projects/oasis/organisation-unlock', 'POST', { code: settings.organisationAccessCode }); const organisationCookie = response.headers.get('set-cookie')!.split(';')[0];
    const organisationForm = await (await req('/projects/oasis/organisation-form?country=Germany', 'GET', undefined, organisationCookie)).json();
    assert.deepEqual(organisationForm.participants, [{ label: 'Participant 1', name: 'Tugay Özkan', role: 'Facilitator', reimbursementCents: 34900 }]);
    const organisationInput = { requestId: crypto.randomUUID(), organisationName: 'Test Youth Organisation', country: 'Germany', legalRepresentativeName: 'Alex Representative', signaturePlace: 'Berlin', signatureDate: '2026-09-06', accountHolder: 'Test Youth Organisation', iban: 'DE89370400440532013000', bankCountry: 'Germany', swift: 'COBADEFFXXX', signature: claim.signature, declaration: true };
    response = await req('/projects/oasis/organisation-declarations', 'POST', organisationInput, organisationCookie);
    const organisationReceipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(organisationReceipt) + log); assert.equal(organisationReceipt.totalCents, 34900);
    assert.equal((await req('/projects/oasis/organisation-declarations', 'POST', { ...organisationInput, requestId: crypto.randomUUID() }, organisationCookie)).status, 409);
    const organisationList = await (await req('/admin/projects/oasis/organisation-declarations', 'GET', undefined, admin)).json(); assert.equal(organisationList.length, 1); assert.equal(organisationList[0].country, 'Germany');
    response = await req(`/admin/organisation-declarations/${organisationReceipt.id}/pdf`, 'GET', undefined, admin); assert.equal(response.status, 200, log);
    const organisationBytes = new Uint8Array(await response.arrayBuffer()); assert.equal((await PDFDocument.load(organisationBytes)).getTitle(), 'Reimbursement Declaration - Test Youth Organisation - Germany'); await mkdir('tmp/pdfs', { recursive: true }); await writeFile('tmp/pdfs/organisation-php-qa.pdf', organisationBytes);
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

    const modernDocument = await PDFDocument.create(); modernDocument.addPage([595, 842]);
    const modernPdf = await modernDocument.save();
    assert.match(Buffer.from(modernPdf).toString('latin1'), /\/ObjStm/, 'fixture uses compressed PDF object streams');
    const modernClaim = { ...claim, requestId: crypto.randomUUID() };
    response = await req('/projects/oasis/unlock', 'POST', { code: settings.accessCode }); const modernParticipantCookie = response.headers.get('set-cookie')!.split(';')[0];
    response = await req('/projects/oasis/submissions', 'POST', form(modernClaim, modernPdf, 'application/pdf', 'modern-ticket.pdf'), modernParticipantCookie);
    const modernReceipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(modernReceipt) + log);
    assert.deepEqual(await readdir(path.join(dir, 'claims', 'oasis', modernReceipt.id)), ['ticket-1.pdf'], 'submission defers PDF generation until administrator download');
    const originalModernPdf = await req(`/admin/submissions/${modernReceipt.id}/tickets/1`, 'GET', undefined, admin);
    assert.equal(originalModernPdf.status, 200); assert.deepEqual(new Uint8Array(await originalModernPdf.arrayBuffer()), modernPdf, 'normalization does not replace the stored original');
    response = await req(`/admin/submissions/${modernReceipt.id}/pdf`, 'GET', undefined, admin);
    assert.equal(response.status, 200, log); assert.ok((await PDFDocument.load(await response.arrayBuffer())).getPageCount() >= 3);
    assert.equal((await req(`/admin/submissions/${modernReceipt.id}`, 'DELETE', undefined, admin)).status, 200);
    // One invoice, separate outbound and return passes, missing files rejected, corrupt files retained for review.
    const flight = { ...claim, requestId: crypto.randomUUID(), tickets: [{ ...claim.tickets[0], mode: 'Flight', journeyType: 'round-trip', connections: true, from: 'FRA', to: 'TLL', boardingPasses: [
      { journey: 'outbound', from: 'FRA', to: 'MUC' }, { journey: 'outbound', from: 'MUC', to: 'TLL' }, { journey: 'return', from: 'TLL', to: 'FRA' },
    ] }] };
    const flightForm = form(flight, modernPdf, 'application/pdf', 'invoice.pdf');
    flightForm.append('boarding-0-0', new Blob([modernPdf], { type: 'application/pdf' }), 'outbound.pdf');
    flightForm.append('boarding-0-2', new Blob(['%PDF-1.7 broken content'], { type: 'application/pdf' }), 'return-unreadable.pdf');
    response = await req('/projects/oasis/submissions', 'POST', flightForm, modernParticipantCookie);
    assert.equal(response.status, 422, 'missing selected boarding pass must block submission');
    flightForm.append('boarding-0-1', new Blob([modernPdf], { type: 'application/pdf' }), 'connection.pdf');
    response = await req('/projects/oasis/submissions', 'POST', flightForm, modernParticipantCookie);
    const flightReceipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(flightReceipt) + log);
    assert.equal(flightReceipt.totalCents, 34900, 'boarding passes never add cost');
    const flightSaved = await (await req(`/admin/submissions/${flightReceipt.id}`, 'GET', undefined, admin)).json();
    assert.equal(flightSaved.tickets.length, 1); assert.equal(flightSaved.tickets[0].boardingPasses.length, 3);
    const flightManifest = await (await req(`/admin/submissions/${flightReceipt.id}/pdf-tickets`, 'GET', undefined, admin)).json();
    assert.equal(flightManifest.documents.length, 4); assert.equal(flightManifest.documents[2].key, 'boarding-1-2'); assert.equal(flightManifest.documents[2].error, undefined);
    assert.equal(flightManifest.documents[3].amount, 0);
    assert.equal((await req(`/admin/submissions/${flightReceipt.id}/documents/boarding-1-1`, 'GET', undefined, participantCookie)).status, 401);
    response = await req(`/admin/submissions/${flightReceipt.id}/pdf`, 'GET', undefined, admin); assert.equal(response.status, 200, log);
    const flightBytes = new Uint8Array(await response.arrayBuffer());
    await PDFDocument.load(flightBytes); await writeFile('tmp/pdfs/flight-php-qa.pdf', flightBytes);

    // Optional real-world regressions stay outside the repository (personal documents).
    for (const [label, inputPath] of [['db', process.env.IJBK_TEST_DB_PDF], ['aliisa', process.env.IJBK_TEST_ALIISA_PDF]]) {
      if (!inputPath) continue;
      const original = await readFile(inputPath);
      const sample = { ...claim, requestId: crypto.randomUUID() };
      response = await req('/projects/oasis/submissions', 'POST', form(sample, original, 'application/pdf', `${label}.pdf`), modernParticipantCookie);
      const sampleReceipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(sampleReceipt) + log);
      response = await req(`/admin/submissions/${sampleReceipt.id}/pdf`, 'GET', undefined, admin); assert.equal(response.status, 200, log);
      const result = new Uint8Array(await response.arrayBuffer()); await PDFDocument.load(result); await writeFile(`tmp/pdfs/${label}-php-qa.pdf`, result);
      // Browser normalization works even when qpdf is unavailable on the deployed host.
      const compatible = await expandPdfObjects(original);
      const prepared = new FormData(); prepared.append('ticket-1', new Blob([compatible], { type: 'application/pdf' }), 'compatible.pdf');
      response = await req(`/admin/submissions/${sampleReceipt.id}/pdf`, 'POST', prepared, admin); assert.equal(response.status, 200, log);
      await writeFile(`tmp/pdfs/${label}-compatible-php-qa.pdf`, new Uint8Array(await response.arrayBuffer()));
      const stored = new Uint8Array(await (await req(`/admin/submissions/${sampleReceipt.id}/tickets/1`, 'GET', undefined, admin)).arrayBuffer());
      assert.deepEqual(stored, new Uint8Array(original), 'compatibility generation preserves original forensic evidence');
    }
    const longPdf = await PDFDocument.create(); for (let i = 0; i < 11; i++) longPdf.addPage();
    response = await req('/projects/oasis/submissions', 'POST', form({ ...claim, requestId: crypto.randomUUID() }, await longPdf.save(), 'application/pdf', 'eleven-pages.pdf'), modernParticipantCookie);
    const longReceipt = await response.json(); assert.equal(response.status, 201, JSON.stringify(longReceipt));
    response = await req(`/admin/submissions/${longReceipt.id}/pdf`, 'GET', undefined, admin); assert.equal(response.status, 200, log); await PDFDocument.load(await response.arrayBuffer());
    assert.ok(!log.includes('PHP Warning'), log);
  } finally { child.kill(); await new Promise<void>(r => child.once('exit', () => r())); if (process.env.IJBK_KEEP_TEST_DATA) console.log(`Browser QA data: ${dir}`); else await rm(dir, { recursive: true, force: true }); }
});
