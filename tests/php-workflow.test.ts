import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFArray, PDFDict, PDFName, PDFDocument } from 'pdf-lib';
import { expandPdfObjects } from '../shared/pdf-compatibility';
import { hashPassword } from './helpers/auth';

test('PHP saved applications, approval locks and expected team counts', { timeout: 60000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ijbk-php-test-'));
  const server = createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port; await new Promise<void>(r => server.close(() => r()));
  const base = `http://127.0.0.1:${port}`;
  const apiPath = path.resolve('php-api');
  const password = 'test-admin-secret';
  // Load source directly with a synthetic administrator and isolated storage.
  await writeFile(path.join(dir, 'router.php'), `<?php define('IJBK_ADMIN_PASSWORD_HASH', '${await hashPassword(password)}'); require '${apiPath}/lib.php'; require '${apiPath}/pdf.php'; $source=file_get_contents('${apiPath}/index.php'); $source=str_replace("if (!defined('IJBK_ADMIN_PASSWORD_HASH')) require_once __DIR__ . '/bootstrap.php';", '', $source); $source=str_replace("__DIR__ . '/lib.php'", "'${apiPath}/lib.php'", $source); $source=str_replace("__DIR__ . '/project-drive.php'", "'${apiPath}/project-drive.php'", $source); $source=str_replace("__DIR__ . '/pdf.php'", "'${apiPath}/pdf.php'", $source); eval(substr($source,5));`);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, path.join(dir, 'router.php')], { env: { ...process.env, IJBK_STORAGE_DIR: dir }, stdio: ['ignore', 'ignore', 'pipe'] });
  let log = ''; child.stderr.on('data', data => { log += data.toString(); });
  try {
    for (let n = 0; n < 60; n++) { try { await fetch(`${base}/api/projects/oasis`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    async function req(route: string, method = 'GET', body?: unknown, cookie = '') {
      return fetch(`${base}/api${route}`, { method, headers: { Origin: base, Cookie: cookie, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    }
    assert.equal((await req('/admin/projects/oasis/drive')).status,401);
    assert.equal((await req('/admin/projects/oasis/drive/participants','POST',{})).status,401);
    let response = await req('/admin/login', 'POST', { password }); assert.equal(response.status, 200, log);
    const admin = response.headers.get('set-cookie')!.split(';')[0];
    const settings = { projectCode: 'TEST-2026', shortName: 'OASIS', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countryLimits: { Germany: 30900 }, expectedParticipants: { Germany: 6 }, countries: ['Germany'], enabled: true, accessCode: 'participant-test-code', partnerAccessCodes: { Germany: 'organisation-test-code' } };
    response = await req('/admin/projects/oasis', 'PUT', settings, admin); assert.equal(response.status, 200, await response.text());
    assert.equal((await (await req('/projects/oasis')).json()).countryLimits.Germany, 30900);
    response = await req('/projects/oasis/unlock', 'POST', { code: settings.accessCode }); const participantCookie = response.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await req('/projects/oasis/session')).status, 401);
    assert.equal((await (await req('/projects/oasis')).json()).reimbursementDriveUrl, undefined);
    assert.equal((await (await req('/projects/oasis/session', 'GET', undefined, participantCookie)).json()).reimbursementDriveUrl, 'https://drive.google.com/drive/folders/10zUrdflJQt9--SfnFL_D70Dpreg8Ak-k');
    assert.equal((await req('/admin/projects/oasis/drive','GET',undefined,participantCookie)).status,401);
    const driveDashboard=await (await req('/admin/projects/oasis/drive','GET',undefined,admin)).json();
    assert.equal(driveDashboard.configured,true);assert.equal(driveDashboard.connected,false);
    const participant = { firstName: 'Tugay', lastName: 'Özkan', citizenship: 'Turkish', team: 'Germany', residenceCountry: 'Germany', city: 'Berlin', role: 'Facilitator', arrivalDate: '2026-09-20', departureDate: '2026-09-27', dateOfBirth: '2000-03-22', email: 'participant@example.test', phone: '+49 123456789', address: 'Example Street 12', accountHolder: 'Tugay Özkan', bankName: 'Test Bank', bankAccount: 'DE89370400440532013000', bic: 'COBADEFFXXX', bankAddress: 'Berlin', signaturePlace: 'Berlin', notes: 'Test notes', sendingOrganisation: 'Test youth organisation', greenTravel: true };
    const claim = { requestId: crypto.randomUUID(), participant, declaration: true, signature: `data:image/png;base64,${(await readFile('tests/fixtures/signature.png')).toString('base64')}`, tickets: [{ purchaseDate: '2026-09-04', travelDate: '2026-09-20', from: 'Berlin', to: 'Vienna', mode: 'Train', ticketType: 'Paper ticket', currency: 'EUR', amount: 349 }], extraCents: 90000, countryLimitCents: 90000, destinationCity: 'Forged destination' };
    function form(input = claim, file: Uint8Array = ticket, type = 'image/jpeg', filename = 'train.jpg') { const f = new FormData(); f.append('claim', JSON.stringify(input)); f.append('ticket-0', new Blob([file], { type }), filename); return f; }
    const ticket = await readFile('tests/fixtures/ticket.jpg');

    response = await req('/projects/oasis/organisation-unlock', 'POST', { country: 'Germany', code: settings.partnerAccessCodes.Germany });
    const organisationCookie = response.headers.get('set-cookie')!.split(';')[0];
    const progress = async () => (await (await req('/projects/oasis/organisation-form?country=Germany', 'GET', undefined, organisationCookie)).json());
    const save = async (number = '', revision = 0, input: unknown = { participant: {}, tickets: [], signature: '', declaration: false }, attach = false) => {
      const f = new FormData(); f.append('claim', JSON.stringify(input)); if (number) { f.append('number', number); f.append('revision', String(revision)); }
      if (attach) f.append('ticket-0', new Blob([ticket], { type: 'image/jpeg' }), 'outward.jpg');
      return req('/projects/oasis/applications/save', 'POST', f, participantCookie);
    };
    let draftResponse = await save(); assert.equal(draftResponse.status, 200); const blank = await draftResponse.json();
    assert.match(blank.number, /^IJBK-[0-9a-f]{48}$/);
    assert.deepEqual((await progress()).progress, { expected: 6, submitted: 0, approved: 0, pending: 0, missing: 6, ready: false });
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: blank.number })).status, 401);
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: 'wrong', email: participant.email }, participantCookie)).status, 404);
    const partial = { ...claim, participant: { ...participant, bankAccount: '' }, signature: '', declaration: false };
    draftResponse = await save(blank.number, blank.revision, partial, true); assert.equal(draftResponse.status, 200); const partialSaved = await draftResponse.json();
    assert.equal((await save(blank.number, blank.revision)).status, 409, 'stale tabs cannot overwrite');
    const resumed = await (await req('/projects/oasis/applications/resume', 'POST', { number: blank.number }, participantCookie)).json();
    assert.equal(resumed.data.participant.bankAccount, ''); assert.equal(resumed.data.signature, ''); assert.equal(resumed.files['ticket-0'].name, 'outward.jpg'); assert.equal(resumed.files['ticket-0'].path, undefined);
    const restored = await req('/projects/oasis/applications/document', 'POST', { number: blank.number, revision: partialSaved.revision, key: 'ticket-0' }, participantCookie);
    assert.deepEqual(Buffer.from(await restored.arrayBuffer()), ticket);
    const incomplete = form(partial); incomplete.append('number', blank.number); incomplete.append('revision', String(partialSaved.revision));
    assert.equal((await req('/projects/oasis/submissions', 'POST', incomplete, participantCookie)).status, 422);
    const noPassFlight = { ...claim, requestId: crypto.randomUUID(), participant: { ...participant, greenTravel: false }, tickets: [{ ...claim.tickets[0], mode: 'Flight', boardingPasses: [] }] };
    assert.equal((await req('/projects/oasis/submissions', 'POST', form(noPassFlight), participantCookie)).status, 422, 'omitting the flight segment array cannot bypass required boarding passes');
    const renewed = await req('/projects/oasis/unlock', 'POST', { code: settings.accessCode });
    const renewedCookie = renewed.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: blank.number }, renewedCookie)).status, 200, 'number resumes across sessions');
    const applications: { number: string; revision: number; id: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const input = { ...claim, requestId: crypto.randomUUID(), participant: { ...participant, firstName: `Person${i}`, email: `person${i}@example.test` } };
      const saved = await (await save('', 0, input, true)).json();
      const f = form(input); f.append('number', saved.number); f.append('revision', String(saved.revision));
      const submittedResponse = await req('/projects/oasis/submissions', 'POST', f, participantCookie); assert.equal(submittedResponse.status, 201, await submittedResponse.clone().text());
      const submitted = await submittedResponse.json(); applications.push({ ...saved, id: submitted.id });
      if (i < 4) assert.equal((await req(`/admin/submissions/${submitted.id}/finalize`, 'PUT', {}, admin)).status, 200);
    }
    const source = await progress();
    assert.deepEqual(source.progress, { expected: 6, submitted: 5, approved: 4, pending: 1, missing: 1, ready: false });
    assert.equal(source.participants.length, 4); assert.equal(source.totalCents, 4 * 30900);
    const organisationInput = { requestId: crypto.randomUUID(), organisationName: 'Test Youth Organisation', country: 'Germany', submitterRole: 'sending-organisation-member', submitterName: 'Alex Member', submitterPosition: 'Project Coordinator', submitterPhone: '+49 123456789', submitterEmail: 'member@example.test', signaturePlace: 'Berlin', signatureDate: '2026-09-06', accountHolder: 'Test Youth Organisation', iban: 'DE89370400440532013000', bankCountry: 'Germany', swift: 'COBADEFFXXX', signature: claim.signature, declaration: true };
    assert.equal((await req('/projects/oasis/organisation-declarations', 'POST', organisationInput, organisationCookie)).status, 422);
    const locked = applications[0];
    const lockedResponse = await req('/projects/oasis/applications/resume', 'POST', { number: locked.number }, participantCookie);
    assert.equal(lockedResponse.status, 403); assert.match(await lockedResponse.text(), /already been finalized/);
    assert.equal((await save(locked.number, locked.revision, partial)).status, 403);
    const lockedForm = form({ ...claim, requestId: crypto.randomUUID() }); lockedForm.append('number', locked.number); lockedForm.append('revision', String(locked.revision));
    assert.equal((await req('/projects/oasis/submissions', 'POST', lockedForm, participantCookie)).status, 403);
    assert.equal((await req('/projects/oasis/applications/document', 'POST', { number: locked.number, revision: locked.revision, key: 'ticket-0' }, participantCookie)).status, 403);
    const pending = applications[4];
    const returnedToDraft = await save(pending.number, pending.revision, claim, true); assert.equal(returnedToDraft.status, 200);
    assert.equal((await progress()).progress.submitted, 4);
    assert.equal((await req(`/admin/submissions/${pending.id}/finalize`, 'PUT', {}, admin)).status, 404);
    const updated = await returnedToDraft.json();
    const finalInput = { ...claim, requestId: crypto.randomUUID(), participant: { ...participant, email: 'person4@example.test' } };
    const finalForm = form(finalInput); finalForm.append('number', pending.number); finalForm.append('revision', String(updated.revision));
    const finalReceipt = await (await req('/projects/oasis/submissions', 'POST', finalForm, participantCookie)).json();
    assert.equal((await req(`/admin/submissions/${finalReceipt.id}/finalize`, 'PUT', {}, admin)).status, 200);
    assert.deepEqual((await progress()).progress, { expected: 6, submitted: 5, approved: 5, pending: 0, missing: 1, ready: false });
    const sixth = await (await req('/projects/oasis/submissions', 'POST', form({ ...claim, requestId: crypto.randomUUID(), participant: { ...participant, email: 'sixth@example.test' } }), participantCookie)).json();
    assert.equal((await progress()).progress.ready, false);
    // Pre-draft applications recover by their displayed reference plus email.
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: sixth.reference }, participantCookie)).status, 422);
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: sixth.reference, email: 'wrong@example.test' }, participantCookie)).status, 404);
    const legacy = await (await req('/projects/oasis/applications/resume', 'POST', { number: sixth.reference, email: 'SIXTH@example.test' }, participantCookie)).json();
    assert.match(legacy.number, /^IJBK-[0-9a-f]{48}$/); assert.equal(legacy.submitted, true); assert.equal(legacy.data.participant.email, 'sixth@example.test'); assert.equal(legacy.data.signature, claim.signature);
    const legacyDocument = await req('/projects/oasis/applications/document', 'POST', { number: legacy.number, key: 'ticket-0', revision: legacy.revision }, participantCookie);
    assert.deepEqual(Buffer.from(await legacyDocument.arrayBuffer()), ticket);
    const byId = await (await req('/projects/oasis/applications/resume', 'POST', { number: sixth.id, email: 'sixth@example.test' }, participantCookie)).json();
    assert.equal(byId.number, legacy.number, 'reference and ID recover the same application');
    assert.equal((await progress()).progress.submitted, 6, 'loading does not withdraw or resubmit a claim');
    assert.equal((await req(`/admin/submissions/${sixth.id}/finalize`, 'PUT', {}, admin)).status, 200);
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: sixth.reference, email: 'sixth@example.test' }, participantCookie)).status, 403, 'finalized legacy reference is locked');
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: legacy.number }, participantCookie)).status, 403);
    assert.equal((await progress()).progress.ready, true);
    const duplicate = await req('/projects/oasis/submissions', 'POST', form({ ...claim, requestId: crypto.randomUUID(), participant: { ...participant, email: 'SIXTH@example.test' } }), participantCookie);
    assert.equal(duplicate.status, 201); const duplicateReceipt = await duplicate.json();
    assert.equal((await progress()).progress.submitted, 6, 'same email counts once');
    assert.equal((await progress()).progress.ready, false, 'latest unapproved version must not inherit earlier approval');
    assert.equal((await req(`/admin/submissions/${duplicateReceipt.id}/finalize`, 'PUT', {}, admin)).status, 200);

    assert.equal((await req('/projects/oasis/organisation-declarations', 'POST', organisationInput, organisationCookie)).status, 201);
    // A locked application's bearer number stays locked even after admin deletion.
    assert.equal((await req(`/admin/submissions/${locked.id}`, 'DELETE', undefined, admin)).status, 200);
    assert.equal((await req('/projects/oasis/applications/resume', 'POST', { number: locked.number }, participantCookie)).status, 403);
  } finally { child.kill(); await new Promise<void>(resolve => child.once('exit', () => resolve())); await rm(dir, { recursive: true, force: true }); }
});
