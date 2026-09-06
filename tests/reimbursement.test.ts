import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { PDFArray, PDFDict, PDFName, PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { hashPassword } from '../server/auth';
import { claimSchema, euroCents, reimbursement, submissionReference, claimReference, settingsSchema, countryCode, type SavedClaim } from '../shared/reimbursement';
import { historicalRate } from '../server/rates';

let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare['getD1Database']>>;
const origin = 'https://ijbk.test';
const adminPassword = 'test-only-admin-password-12345';
let adminCookie = '';
let participantCookie = '';
let signature: string;
let jpeg: Uint8Array;
let multiPdf: Uint8Array;
const participant = { name: 'Zoë Müller-Łukasz', firstName: 'Zoë', lastName: 'Müller-Łukasz', city: 'Berlin', residenceCountry: 'Germany', sendingOrganisation: 'Example youth organisation', notes: 'Regional train and onward connection.', greenTravel: true, arrivalDate: '2026-09-20', departureDate: '2026-09-27', role: 'Team Leader', bankName: 'Test Bank', accountHolder: 'Zoë Müller-Łukasz', signaturePlace: 'Berlin', citizenship: 'German', team: 'Germany', dateOfBirth: '2000-03-22', email: 'participant@example.test', phone: '+49 123 456 789', bankAccount: 'DE89370400440532013000', bic: 'COBADEFFXXX', bankAddress: 'Test Bank\nBerlin, Germany', address: 'Example Street 12\nBerlin, Germany' };

async function request(path: string, method = 'GET', body?: unknown, cookie = '') {
  const req = new Request(`${origin}/api${path}`, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return mf.dispatchFetch(req.url, { method, headers: Object.fromEntries(req.headers), body: body ? await req.arrayBuffer() : undefined });
}
const cookieFrom = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];
const details = { shortName: 'OASIS', activityStartDate: '2026-09-20', activityEndDate: '2026-09-27', destinationCity: 'Vienna', countryCodes: { Germany: 'DE', Italy: 'IT', Latvia: 'LV', Estonia: 'EE' }, countryLimits: { Germany: 30900, Italy: 30900, Latvia: 40000, Estonia: 40000 } };
const baseTicket = { purchaseDate: '2026-09-04', travelDate: '2026-09-20', from: 'Berlin', to: 'Vienna', mode: 'Train', ticketType: 'Electronic ticket', currency: 'EUR', amount: 25.5 };
function claimForm(overrides: Record<string, unknown> = {}, files = [jpeg, multiPdf, jpeg]) {
  const claim = { requestId: crypto.randomUUID(), participant, signature, declaration: true, tickets: [baseTicket, { ...baseTicket, mode: 'Flight', currency: 'HUF', amount: 1000 }, { ...baseTicket, mode: 'Bus', amount: 10.01 }], ...overrides };
  const form = new FormData(); form.append('claim', JSON.stringify(claim));
  files.forEach((bytes, i) => form.append(`ticket-${i}`, new Blob([bytes], { type: i === 1 ? 'application/pdf' : 'image/jpeg' }), i === 1 ? 'two-page-flight-ticket.pdf' : `ticket-${i + 1}.jpg`));
  return form;
}

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ name: 'reimbursement-test', modules: true, scriptPath: 'dist/server/index.js', compatibilityDate: '2026-09-01', d1Databases: ['DB'], r2Buckets: ['FILES'], bindings: { ADMIN_PASSWORD_HASH: await hashPassword(adminPassword) } }));
  db = await mf.getD1Database('DB');
  signature = `data:image/png;base64,${(await readFile('tests/fixtures/signature.png')).toString('base64')}`;
  jpeg = await readFile('tests/fixtures/ticket.jpg');
  const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([595, 842]); p1.drawText('SAMPLE FLIGHT TICKET - SOURCE PAGE ONE', { x: 40, y: 760, font, size: 16 }); p1.drawText('Passenger: Test Participant. Flight AB123.', { x: 40, y: 700, font, size: 13 });
  const p2 = doc.addPage([842, 595]); p2.setRotation(degrees(90)); p2.drawText('SOURCE PAGE TWO - BAGGAGE RECEIPT', { x: 40, y: 500, font, size: 16 });
  multiPdf = await doc.save();
});
after(async () => { await mf?.dispose(); });

test('complete reimbursement workflow and access isolation', async () => {
  let response = await request('/projects/oasis');
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { projectCode: '', countries: [], enabled: false, hasAccessCode: false });
  assert.equal((await request('/admin/projects')).status, 401);
  assert.equal((await request('/admin/submissions/unknown/pdf')).status, 401);
  assert.equal((await request('/projects/oasis/submissions', 'POST', {})).status, 401);
  assert.equal((await request('/projects/KA152')).status, 404);
  response = await mf.dispatchFetch(`${origin}/api/admin/login`, { method: 'POST', headers: { Origin: 'https://attacker.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
  assert.equal(response.status, 403);
  assert.equal((await request('/admin/login', 'POST', { password: 'wrong' })).status, 401);
  response = await request('/admin/login', 'POST', { password: adminPassword }); assert.equal(response.status, 200); adminCookie = cookieFrom(response);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/); assert.match(response.headers.get('set-cookie')!, /Secure/); assert.match(response.headers.get('set-cookie')!, /SameSite=Strict/);
  response = await request('/admin/projects/oasis', 'PUT', { ...details, projectCode: '2026-1-DE04-KA152-OASIS', countries: ['Germany', 'Italy', 'Latvia', 'Estonia'], accessCode: 'participant-test-code', enabled: true }, adminCookie);
  assert.equal(response.status, 200);
  const publicText = await (await request('/projects/oasis')).text(); assert.ok(!publicText.includes('participant-test-code')); assert.ok(!publicText.includes('access_hash'));
  assert.equal((await request('/projects/oasis/unlock', 'POST', { code: 'wrong' })).status, 401);
  response = await request('/projects/oasis/unlock', 'POST', { code: 'participant-test-code' }); assert.equal(response.status, 200); participantCookie = cookieFrom(response);
  assert.equal((await request('/projects/who-am-ai/session', 'GET', undefined, participantCookie)).status, 401);
  assert.equal((await request('/admin/projects', 'GET', undefined, participantCookie)).status, 401);
  await db.prepare('INSERT INTO rate_cache (key, rate, rate_date, source) VALUES (?, ?, ?, ?)').bind('HUF:2026-09-04', 0.00275, '2026-09-04', 'European Central Bank via Frankfurter').run();
  response = await request('/projects/oasis/rate?currency=HUF&date=2026-09-04', 'GET', undefined, participantCookie); assert.equal(response.status, 200); assert.equal((await response.json() as {rate:number}).rate, 0.00275);
  const requestId = crypto.randomUUID();
  response = await request('/projects/oasis/submissions', 'POST', claimForm({ requestId }), participantCookie);
  const receipt = await response.json() as { id: string; totalCents: number; error?: string };
  assert.equal(response.status, 201, receipt.error); assert.equal(receipt.totalCents, 3826);
  assert.equal(await (await mf.getR2Bucket('FILES')).head(`reimbursements/oasis/${receipt.id}/complete.pdf`), null, 'submission defers PDF generation until administrator download');
  response = await request('/projects/oasis/submissions', 'POST', claimForm({ requestId }), participantCookie); assert.equal(response.status, 200); assert.equal((await response.json() as {id:string}).id, receipt.id);
  response = await request(`/admin/submissions/${receipt.id}`, 'GET', undefined, adminCookie); assert.equal(response.status, 200);
  const saved = await response.json() as SavedClaim;
  assert.equal(saved.reference, `OASIS_DE_ZOË_MÜLLERŁUKASZ_${saved.createdAt.slice(0,10).replace(/-/g, '_')}`); assert.equal(saved.countryLimitCents, 30900); assert.equal(saved.activityStartDate, details.activityStartDate); assert.equal(saved.activityEndDate, details.activityEndDate); assert.equal(saved.destinationCity, 'Vienna'); assert.equal(saved.participant.role, 'Team Leader'); assert.equal(saved.tickets[0].ticketType, 'Electronic ticket'); assert.equal(saved.participant.name, participant.name); assert.equal(saved.tickets[1].euroCents, 275); assert.equal(saved.tickets[1].rateDate, '2026-09-04'); assert.deepEqual(saved.tickets.map(t => t.serial), [1, 2, 3]);
  assert.equal((await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, participantCookie)).status, 401);
  assert.equal((await request(`/admin/submissions/${receipt.id}/pdf-tickets`, 'GET', undefined, participantCookie)).status, 401);
  assert.equal((await request(`/admin/submissions/${receipt.id}/tickets/2`, 'GET', undefined, participantCookie)).status, 401);
  const manifest = await (await request(`/admin/submissions/${receipt.id}/pdf-tickets`, 'GET', undefined, adminCookie)).json() as { tickets: {serial:number; filename:string}[]; skippedImages:number };
  assert.equal(manifest.tickets.length, 1); assert.equal(manifest.tickets[0].serial, 2); assert.equal(manifest.skippedImages, 2);
  const original = await request(`/admin/submissions/${receipt.id}/tickets/2`, 'GET', undefined, adminCookie);
  assert.equal(original.status, 200); assert.deepEqual(new Uint8Array(await original.arrayBuffer()), multiPdf);
  assert.equal((await request(`/admin/submissions/${receipt.id}/tickets/1`, 'GET', undefined, adminCookie)).status, 415);
  assert.equal((await request(`/admin/submissions/${receipt.id}/tickets/31`, 'GET', undefined, adminCookie)).status, 404);
  response = await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, adminCookie); assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition')!, /attachment/); assert.equal(response.headers.get('cache-control'), 'no-store');
  const bytes = new Uint8Array(await response.arrayBuffer()); const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 5); const tail = pdf.getPages().slice(-3); assert.ok(tail[1].getHeight() > 1000, 'two source pages stay on one extended ticket page'); assert.ok(tail[0].getHeight() < 850); assert.ok(tail[2].getHeight() < 850);
  const destinations = pdf.getPages().flatMap(page => {
      const annotations = page.node.Annots();
      return annotations ? annotations.asArray().flatMap(ref => {
        const annotation = pdf.context.lookup(ref, PDFDict);
        if (annotation.get(PDFName.of('Subtype'))?.toString() !== '/Link') return [];
        const destination = annotation.lookupMaybe(PDFName.of('Dest'), PDFArray);
        return destination ? [destination.get(0).toString()] : [];
      }) : [];
    });
    assert.deepEqual(destinations, pdf.getPages().slice(-3).map(page => page.ref.toString()), 'each attachment link targets its ticket page');
    await mkdir('tmp/pdfs', { recursive: true }); await writeFile('tmp/pdfs/reimbursement-qa.pdf', bytes); await writeFile('tmp/pdfs/reimbursement-qa.json', JSON.stringify(saved, null, 2));
  response = await request('/admin/projects/oasis/submissions', 'GET', undefined, adminCookie); assert.equal((await response.json() as unknown[]).length, 1);
  await request('/admin/projects/oasis', 'PUT', { ...details, projectCode: 'NEW-PROJECT-CODE', countries: ['Germany', 'Italy'], accessCode: 'rotated-participant-code', enabled: true }, adminCookie);
  assert.equal((await request('/projects/oasis/session', 'GET', undefined, participantCookie)).status, 401);
  const snapshot = await (await request(`/admin/submissions/${receipt.id}`, 'GET', undefined, adminCookie)).json() as SavedClaim; assert.equal(snapshot.projectCode, '2026-1-DE04-KA152-OASIS');
  response = await request('/projects/oasis/unlock', 'POST', { code: 'rotated-participant-code' }); participantCookie = cookieFrom(response);
  assert.equal((await request('/projects/oasis/submissions', 'POST', claimForm({ participant: { ...participant, team: 'France' } }), participantCookie)).status, 422);
  response = await request('/projects/oasis/submissions', 'POST', claimForm({}, [new Uint8Array([1, 2, 3]), multiPdf, jpeg]), participantCookie);
  assert.equal(response.status, 201); const corruptReceipt = await response.json() as { id: string };
  assert.equal((await request(`/admin/submissions/${corruptReceipt.id}/pdf`, 'GET', undefined, adminCookie)).status, 200);
  await request(`/admin/submissions/${corruptReceipt.id}`, 'DELETE', undefined, adminCookie);
  assert.equal((await request('/projects/oasis/submissions', 'POST', claimForm({}, [jpeg]), participantCookie)).status, 422);
  assert.equal((await request('/projects/oasis/submissions', 'POST', claimForm({ signature: '' }), participantCookie)).status, 422);
  const records = await db.prepare('SELECT count(*) AS n FROM submissions').first<{ n: number }>(); assert.equal(records!.n, 1, 'invalid PDF/signature leaves no partial submission');
  await request('/admin/projects/oasis', 'PUT', { ...details, projectCode: 'NEW-PROJECT-CODE', countries: ['Germany', 'Italy'], enabled: false }, adminCookie);
  assert.equal((await request('/projects/oasis/unlock', 'POST', { code: 'rotated-participant-code' })).status, 403);
  assert.equal((await request(`/admin/submissions/${receipt.id}`, 'DELETE', undefined, participantCookie)).status, 401);
  assert.equal((await request(`/admin/submissions/${receipt.id}/extra`, 'PUT', { extraCents: 4000, note: 'Approved additional support' }, participantCookie)).status, 401);
  assert.equal((await request(`/admin/submissions/${receipt.id}/extra`, 'PUT', { extraCents: -1, note: '' }, adminCookie)).status, 422);
  response = await request(`/admin/submissions/${receipt.id}/extra`, 'PUT', { extraCents: 4000, note: 'Approved additional support' }, adminCookie);
  assert.equal(response.status, 200); assert.equal(reimbursement(await response.json() as SavedClaim).finalCents, 7826);
  response = await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, adminCookie);
  assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition')!, /Reimbursement%20Declaration%20-%20Zo/);
  await writeFile('tmp/pdfs/reimbursement-extra-qa.pdf', new Uint8Array(await response.arrayBuffer()));
  assert.equal((await request(`/admin/submissions/${receipt.id}`, 'DELETE', undefined, adminCookie)).status, 200);
  assert.equal((await request(`/admin/submissions/${receipt.id}`, 'GET', undefined, adminCookie)).status, 404);
  assert.equal((await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, adminCookie)).status, 404);
  assert.equal((await (await mf.getR2Bucket('FILES')).list()).objects.length, 0);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM submissions').first<{ n: number }>())!.n, 0);
  await request('/admin/logout', 'POST', undefined, adminCookie); assert.equal((await request('/admin/projects', 'GET', undefined, adminCookie)).status, 401);
});

test('validation rejects bad dates, currencies, money and missing declaration', () => {
  const base = { requestId: crypto.randomUUID(), participant, signature: 'data:image/png;base64,test', declaration: true, tickets: [baseTicket] };
  assert.equal(claimSchema.safeParse(base).success, true);
  for (const ticket of [{ ...baseTicket, purchaseDate: '2026-02-30' }, { ...baseTicket, purchaseDate: '2099-01-01' }, { ...baseTicket, amount: -1 }, { ...baseTicket, amount: 1.001 }, { ...baseTicket, travelDate: '2026-01-01' }, { ...baseTicket, currency: 'USD' }, { ...baseTicket, currency: 'BGN' }]) assert.equal(claimSchema.safeParse({ ...base, tickets: [ticket] }).success, false);
  assert.equal(claimSchema.safeParse({ ...base, declaration: false }).success, false);
  assert.equal(euroCents(1.005, 1), 101); assert.equal(euroCents(1000, 0.00275), 275);
});

test('historical rates use prior business date and fail closed on upstream errors', async () => {
  const fakeDb = { prepare: () => ({ bind: () => ({ first: async () => null, run: async () => ({}) }) }) } as unknown as D1Database;
  const fakeFetch = (data: object) => (async () => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  const rate = await historicalRate(fakeDb, 'HUF', '2026-09-05', fakeFetch({ date: '2026-09-04', base: 'HUF', quote: 'EUR', rate: 0.00275 }));
  assert.equal(rate.rateDate, '2026-09-04'); assert.equal(rate.requestedDate, '2026-09-05');
  await assert.rejects(historicalRate(fakeDb, 'HUF', '2026-09-04', fakeFetch({ date: '2026-09-05', base: 'HUF', quote: 'EUR', rate: 0.00275 })), /No historical/);
  await assert.rejects(historicalRate(fakeDb, 'HUF', '2026-09-04', (async () => new Response('Unavailable', { status: 503 })) as typeof fetch), /No historical/);
  await assert.rejects(historicalRate(fakeDb, 'HUF', '2026-09-04', fakeFetch({ date: '2026-09-04', base: 'HUF', quote: 'EUR', rate: -1 })), /No historical/);
});

test('country caps, extra approval, references and new fields', () => {
  assert.deepEqual(reimbursement({ totalCents: 34900, countryLimitCents: 30900, extraCents: 4000 }), { standardCents: 30900, extraCents: 4000, finalCents: 34900 });
  assert.equal(reimbursement({ totalCents: 20000, countryLimitCents: 30900 }).finalCents, 20000);
  assert.equal(reimbursement({ totalCents: 34900, countryLimitCents: 0 }).finalCents, 0);
  assert.equal(submissionReference('It is OK', 'de', 'Tugay', 'Özkan', '2026-09-06T00:00:00Z'), 'ITISOK_DE_TUGAY_ÖZKAN_2026_09_06');
  assert.equal(settingsSchema.safeParse({ ...details, projectCode: 'TEST', countries: ['Germany', 'France'], enabled: true }).success, false);
  const base = { requestId: crypto.randomUUID(), participant, signature: 'data:image/png;base64,test', declaration: true, tickets: [baseTicket] };
  for (const p of [{ ...participant, firstName: '' }, { ...participant, role: 'Administrator' }, { ...participant, departureDate: '2026-09-19' }]) assert.equal(claimSchema.safeParse({ ...base, participant: p }).success, false);
  assert.equal(claimSchema.safeParse({ ...base, tickets: [{ ...baseTicket, currency: 'TRY', ticketType: 'Paper ticket' }] }).success, true);
  assert.equal(claimSchema.safeParse({ ...base, tickets: [{ ...baseTicket, ticketType: undefined }] }).success, false);
});

test('country names derive codes, activity dates validate, and legacy references display consistently', () => {
  const settings = { ...details, countryCodes: { Germany: 'ZZ' }, projectCode: 'TEST', countries: ['Germany'], enabled: true };
  assert.equal(settingsSchema.parse(settings).countryCodes.Germany, 'DE');
  assert.equal(settingsSchema.safeParse({ ...settings, activityEndDate: '2026-09-19' }).success, false);
  assert.equal(countryCode('Türkiye'), 'TR'); assert.equal(countryCode('Germany'), 'DE');
  const legacy = { participant, createdAt:'2026-09-06T23:59:00Z', projectName:'Oasis', reference:'OASISDEZoë-Müller-Łukasz' } as SavedClaim;
  assert.equal(claimReference(legacy), 'OASIS_DE_ZOË_MÜLLERŁUKASZ_2026_09_06');
});


test('flight invoice counts once; boarding passes are ordered, zero-cost and optional', async () => {
  adminCookie = cookieFrom(await request('/admin/login', 'POST', { password: adminPassword }));
  await request('/admin/projects/oasis', 'PUT', { ...details, projectCode: 'TEST', countries: ['Germany'], accessCode: 'flight-test-code', enabled: true }, adminCookie);
  participantCookie = cookieFrom(await request('/projects/oasis/unlock', 'POST', { code: 'flight-test-code' }));
  const boardingPasses = [{ journey: 'outbound', from: 'FRA', to: 'MUC' }, { journey: 'outbound', from: 'MUC', to: 'TLL' }, { journey: 'return', from: 'TLL', to: 'FRA' }];
  const form = claimForm({ tickets: [{ ...baseTicket, from: 'FRA', to: 'TLL', mode: 'Flight', journeyType: 'round-trip', connections: true, boardingPasses }] }, [jpeg]);
  form.append('boarding-0-0', new Blob([multiPdf], { type: 'application/pdf' }), 'outbound.pdf');
  form.append('boarding-0-2', new Blob(['%PDF-2.0 corrupt'], { type: 'application/pdf' }), 'unreadable.pdf');
  let response = await request('/projects/oasis/submissions', 'POST', form, participantCookie);
  const receipt = await response.json() as { id: string; totalCents: number }; assert.equal(response.status, 201, JSON.stringify(receipt)); assert.equal(receipt.totalCents, 2550);
  const manifest = await (await request(`/admin/submissions/${receipt.id}/pdf-tickets`, 'GET', undefined, adminCookie)).json() as { documents: { key: string; amount: number; error?: string }[] };
  assert.equal(manifest.documents.length, 4); assert.equal(manifest.documents[3].amount, 0); assert.match(manifest.documents[2].error!, /missing/);
  response = await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, adminCookie); assert.equal(response.status, 200);
  const result = new Uint8Array(await response.arrayBuffer()); await PDFDocument.load(result); await writeFile('tmp/pdfs/flight-worker-qa.pdf', result);
  const prepared = new FormData(); prepared.append('boarding-1-3', new Blob([multiPdf], { type: 'application/pdf' }), 'compatible.pdf');
  response = await request(`/admin/submissions/${receipt.id}/pdf`, 'POST', prepared, adminCookie); assert.equal(response.status, 200); await PDFDocument.load(await response.arrayBuffer());
  await request(`/admin/submissions/${receipt.id}`, 'DELETE', undefined, adminCookie);
  assert.equal(await (await mf.getR2Bucket('FILES')).head(`reimbursements/oasis/${receipt.id}/boarding-1-1`), null);
});

test('real PDF samples and documents beyond ten pages download through Worker', async () => {
  const pdfs: [string, Uint8Array][] = [];
  for (const [label, inputPath] of [['db', process.env.IJBK_TEST_DB_PDF], ['aliisa', process.env.IJBK_TEST_ALIISA_PDF]]) {
    if (inputPath) pdfs.push([label!, await readFile(inputPath)]);
  }
  const long = await PDFDocument.create();
  for (let i = 0; i < 11; i++) { const page = long.addPage(); page.drawText(`Source page ${i + 1}`); }
  pdfs.push(['eleven-pages', await long.save()]);
  for (const [label, bytes] of pdfs) {
    const form = claimForm({ tickets: [baseTicket] }, []);
    form.append('ticket-0', new Blob([bytes], { type: 'application/pdf' }), `${label}.pdf`);
    let response = await request('/projects/oasis/submissions', 'POST', form, participantCookie);
    const receipt = await response.json() as { id: string }; assert.equal(response.status, 201, JSON.stringify(receipt));
    response = await request(`/admin/submissions/${receipt.id}/pdf`, 'GET', undefined, adminCookie); assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(decodeURIComponent(response.headers.get('X-Document-Warnings') || '%5B%5D')), [], 'readable samples must be displayed, not replaced with a placeholder');
    const result = new Uint8Array(await response.arrayBuffer()); await PDFDocument.load(result); await writeFile(`tmp/pdfs/${label}-worker-qa.pdf`, result);
  }
});
