import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFArray, PDFDict, PDFName, PDFDocument } from 'pdf-lib';
import { expandPdfObjects } from '../shared/pdf-compatibility';
import { hashPassword } from './helpers/auth';

test('Partner sessions isolate country data, submissions, PDFs and code rotation', { timeout: 60000 }, async () => {
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
    const settings = { projectCode: 'TEST-2026', shortName: 'OASIS', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countryLimits: { Germany: 30900, Estonia: 30900 }, expectedParticipants: { Germany: 1, Estonia: 1 }, countries: ['Germany', 'Estonia'], enabled: true, accessCode: 'p', partnerAccessCodes: { Germany: 'g', Estonia: 'e' } };
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

    async function unlock(country: string, code: string) {
      const r = await req('/projects/oasis/organisation-unlock','POST',{country,code}); assert.equal(r.status,200,await r.clone().text()); return r.headers.get('set-cookie')!.split(';')[0];
    }
    const reveal=await req('/admin/projects/oasis/access-codes','GET',undefined,admin);assert.equal(reveal.status,200);assert.deepEqual(await reveal.json(),{participant:'p',partners:{Germany:'g',Estonia:'e'}});
    assert.equal((await req('/admin/projects/oasis/access-codes','GET',undefined,participantCookie)).status,401);
    const publicSettings=await (await req('/projects/oasis')).json();assert.equal(publicSettings.partnerAccessCodes,undefined);assert.equal(publicSettings.accessCode,undefined);
    const germany=await unlock('Germany',settings.partnerAccessCodes.Germany);
    const estonia=await unlock('Estonia',settings.partnerAccessCodes.Estonia);
    assert.equal((await req('/projects/oasis/organisation-unlock','POST',{country:'Germany',code:settings.partnerAccessCodes.Estonia})).status,401);
    assert.equal((await req('/projects/oasis/organisation-unlock','POST',{code:settings.partnerAccessCodes.Germany})).status,200);
    const scoped=await (await req('/projects/oasis/organisation-session','GET',undefined,germany)).json();
    assert.deepEqual(scoped.countries,['Germany']);assert.deepEqual(Object.keys(scoped.countryLimits),['Germany']);assert.equal(scoped.country,'Germany');
    assert.equal((await req('/projects/oasis/organisation-form?country=Estonia','GET',undefined,germany)).status,403);
    assert.equal((await req('/projects/oasis/organisation-form?country=Germany','GET',undefined,estonia)).status,403);
    assert.equal((await req('/projects/oasis/partner-documents','GET',undefined,participantCookie)).status,401);
    const docIds: Record<string, { declaration: string; agreement: string }> = {};
    for(const [country,cookie] of [['Germany',germany],['Estonia',estonia]]) {
      const submitted=await (await req('/projects/oasis/submissions','POST',form({...claim,requestId:crypto.randomUUID(),participant:{...participant,team:country,email:country.toLowerCase()+'@example.test'}}),participantCookie)).json();
      assert.equal((await req(`/admin/submissions/${submitted.id}/finalize`,'PUT',{},admin)).status,200);
      const input={requestId:crypto.randomUUID(),organisationName:country+' Youth',organisationOid:'E12345678',country,submitterRole:'team-leader',submitterName:'Test Leader',submitterPosition:'',submitterPhone:'+49 123456789',submitterEmail:'leader@example.test',signaturePlace:'Berlin',signatureDate:'2026-09-06',accountHolder:'Youth Team',iban:'DE89370400440532013000',bankCountry:country,swift:'COBADEFFXXX',signature:claim.signature,declaration:true};
      assert.equal((await req('/projects/oasis/organisation-declarations','POST',{...input,country:country==='Germany'?'Estonia':'Germany'},cookie)).status,403);
      let r=await req('/projects/oasis/organisation-declarations','POST',input,cookie);assert.equal(r.status,201,await r.clone().text());const declaration=(await r.json()).id;
      const agreement={requestId:crypto.randomUUID(),partnerName:country+' Youth',partnerOid:'E10000000',partnerCountry:country,contactName:'Test Leader',contactEmail:'leader@example.test',contactPhone:'+49 123456789',iban:input.iban,accountHolder:input.accountHolder,swift:input.swift,bankName:'Test Bank',bankAddress:'Berlin',bankCurrency:'EUR',legalRepresentativeName:'Test Leader',legalRepresentativePosition:'Coordinator',signerEmail:'signer@example.test',signaturePlace:'Berlin',signatureDate:'2026-09-06',signature:claim.signature,declaration:true};
      assert.equal((await req('/projects/oasis/partnership-agreements','POST',{...agreement,partnerCountry:country==='Germany'?'Estonia':'Germany'},cookie)).status,403);
      r=await req('/projects/oasis/partnership-agreements','POST',agreement,cookie);assert.equal(r.status,201,await r.clone().text());docIds[country]={declaration,agreement:(await r.json()).id};
      const own=await (await req('/projects/oasis/partner-documents','GET',undefined,cookie)).json();assert.equal(own.country,country);assert.equal(own.declarations.length,1);assert.equal(own.agreements.length,1);assert.equal(own.declarations[0].id,declaration);
      assert.equal((await req(`/projects/oasis/organisation-declarations/${declaration}/pdf`,'GET',undefined,cookie)).status,200);
      assert.equal((await req(`/projects/oasis/partnership-agreements/${docIds[country].agreement}/pdf`,'GET',undefined,cookie)).status,200);
    }
    for(const kind of ['declaration','agreement'] as const) {
      const route=kind==='declaration'?'organisation-declarations':'partnership-agreements';
      assert.equal((await req(`/projects/oasis/${route}/${docIds.Estonia[kind]}/pdf`,'GET',undefined,germany)).status,404);
      assert.equal((await req(`/projects/oasis/${route}/${docIds.Germany[kind]}/pdf`,'GET',undefined,estonia)).status,404);
    }
    assert.equal((await (await req('/admin/projects/oasis/organisation-declarations','GET',undefined,admin)).json()).length,2);
    const {accessCode,partnerAccessCodes,...unchanged}=settings;
    assert.equal((await req('/admin/projects/oasis','PUT',{...unchanged,partnerAccessCodes:{Germany:partnerAccessCodes.Estonia}},admin)).status,422,'duplicate codes are rejected');
    assert.equal((await req('/projects/oasis/organisation-session','GET',undefined,germany)).status,200,'failed settings update does not revoke access');
    assert.equal((await req('/admin/projects/oasis','PUT',{...unchanged,partnerAccessCodes:{Germany:'replacement-germany-code'}},admin)).status,200);
    assert.equal((await req('/projects/oasis/organisation-session','GET',undefined,germany)).status,401);
    assert.equal((await req('/projects/oasis/organisation-session','GET',undefined,estonia)).status,200,'rotating Germany does not sign Estonia out');
    const renewed=await unlock('Germany','replacement-germany-code');
    assert.equal((await req('/admin/projects/oasis','PUT',{...unchanged,partnerAccessCodes:{Germany:null}},admin)).status,200);
    assert.equal((await req('/projects/oasis/organisation-session','GET',undefined,renewed)).status,401);
    assert.equal((await req('/projects/oasis/organisation-unlock','POST',{country:'Germany',code:'replacement-germany-code'})).status,401);
    assert.equal((await req('/projects/oasis/organisation-logout','POST',{},estonia)).status,200);
    assert.equal((await req('/projects/oasis/partner-documents','GET',undefined,estonia)).status,401);
    const legacyCookie=await unlock('Estonia',partnerAccessCodes.Estonia);
    execFileSync('php',['-r',"$d=new PDO('sqlite:'.$argv[1]);$d->exec(\"UPDATE sessions SET country=NULL WHERE role='organisation'\");",path.join(dir,'reimbursement.sqlite3')]);
    assert.equal((await req('/projects/oasis/organisation-session','GET',undefined,legacyCookie)).status,401,'old project-wide sessions cannot read any country');
    assert.equal((await req(`/projects/oasis/organisation-declarations/${docIds.Estonia.declaration}/pdf`,'GET',undefined,legacyCookie)).status,401);

  } finally { child.kill(); await new Promise<void>(resolve => child.once('exit', () => resolve())); await rm(dir, { recursive: true, force: true }); }
});
