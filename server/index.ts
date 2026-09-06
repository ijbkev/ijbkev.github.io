import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie } from 'hono/cookie';
import { ZodError, z } from 'zod';
import { projects } from '../src/data/projects';
import { claimReference, declarationText, claimSchema, settingsSchema, projectDetailsSchema, extraSchema, reimbursement, submissionReference, pdfFilename, currencies, euroCents, MAX_FILE_SIZE, MAX_TOTAL_SIZE, type SavedClaim } from '../shared/reimbursement';
import { hashPassword, verifyPassword, newSession, requireSession, rateLimit } from './auth';
import { historicalRate } from './rates';
import { generatePdf, type TicketFile } from './pdf';
import type { Env, Variables, SettingsRow } from './types';
import baseSchemaSql from '../drizzle/0000_unknown_newton_destine.sql';
import detailsSchemaSql from '../drizzle/0001_spicy_master_mold.sql';
const schemaSql = baseSchemaSql + '\n--> statement-breakpoint\n' + detailsSchemaSql;

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const initialized = new WeakMap<D1Database, Promise<unknown>>();
function initialize(db: D1Database) {
  if (!initialized.has(db)) {
    const statements = schemaSql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
      .map(s => s.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS '));
    initialized.set(db, db.batch(statements.map(sql => db.prepare(sql))).catch(error => { initialized.delete(db); throw error; }));
  }
  return initialized.get(db)!;
}
function projectById(id: string) {
  const project = projects.find(p => p.id === id && p.status === 'Upcoming');
  if (!project) throw new HTTPException(404, { message: 'Project not found.' });
  return project;
}
async function settings(db: D1Database, id: string) {
  projectById(id);
  const row = await db.prepare('SELECT * FROM project_settings WHERE project_id = ?').bind(id).first<SettingsRow>();
  const details = await db.prepare('SELECT data FROM project_details WHERE project_id = ?').bind(id).first<{ data: string }>();
  return row ? { ...row, details: details ? JSON.parse(details.data) : undefined } : null;
}
function publicSettings(row: SettingsRow | null) {
  return { ...row?.details, projectCode: row?.project_code ?? '', countries: JSON.parse(row?.countries ?? '[]') as string[], enabled: !!row?.enabled && !!row?.access_hash, hasAccessCode: !!row?.access_hash };
}
async function enabledSettings(db: D1Database, id: string) {
  const row = await settings(db, id);
  if (!row || !row.enabled || !row.access_hash) throw new HTTPException(403, { message: 'Reimbursement is not open for this project. Please contact the organizer.' });
  return row;
}

app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  if (!c.env.DB || !c.env.FILES) throw new HTTPException(503, { message: 'The reimbursement service is not configured. Please contact the organizer.' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    const expected = c.env.APP_ORIGIN || new URL(c.req.url).origin;
    if (origin !== expected || c.req.header('Sec-Fetch-Site') === 'cross-site') throw new HTTPException(403, { message: 'Please submit from the project website.' });
  }
  await initialize(c.env.DB);
  await next();
});
app.use('/api/*', bodyLimit({ maxSize: MAX_TOTAL_SIZE + 1024 * 1024, onError: c => c.json({ error: 'Total upload size must be below 40 MB.' }, 413) }));
app.get('/api/projects/:id', async c => c.json(publicSettings(await settings(c.env.DB, c.req.param('id')))));
app.post('/api/projects/:id/unlock', async c => {
  const id = c.req.param('id');
  await rateLimit(c, `unlock:${id}`, 10);
  const row = await enabledSettings(c.env.DB, id);
  const { code } = z.object({ code: z.string().min(1).max(128) }).parse(await c.req.json());
  if (!await verifyPassword(code, row.access_hash!)) throw new HTTPException(401, { message: 'Incorrect project access code.' });
  await newSession(c, 'participant', id);
  return c.json({ ok: true });
});
app.get('/api/projects/:id/session', async c => {
  await requireSession(c, c.req.param('id'));
  return c.json(publicSettings(await enabledSettings(c.env.DB, c.req.param('id'))));
});
app.get('/api/projects/:id/rate', async c => {
  await requireSession(c, c.req.param('id'));
  await enabledSettings(c.env.DB, c.req.param('id'));
  const currency = c.req.query('currency') ?? '';
  if (!currencies.some(v => v.code === currency)) throw new HTTPException(422, { message: 'Unsupported purchase currency.' });
  await rateLimit(c, 'rates', 300);
  return c.json(await historicalRate(c.env.DB, currency, c.req.query('date') ?? ''));
});

app.post('/api/projects/:id/submissions', async c => {
  const projectId = c.req.param('id');
  const sessionHash = await requireSession(c, projectId);
  const row = await enabledSettings(c.env.DB, projectId);
  const project = projectById(projectId);
  await rateLimit(c, `submit:${projectId}`, 30);
  if (!c.req.header('Content-Type')?.startsWith('multipart/form-data;')) throw new HTTPException(415, { message: 'Upload the reimbursement form with its ticket files.' });
  const form = await c.req.formData();
  const raw = form.get('claim');
  if (typeof raw !== 'string') throw new HTTPException(422, { message: 'Missing reimbursement form.' });
  const input = claimSchema.parse(JSON.parse(raw));
  if (!(JSON.parse(row.countries) as string[]).includes(input.participant.team)) throw new HTTPException(422, { message: 'Select one of this project’s participating countries.' });
  const existing = await c.env.DB.prepare('SELECT id, status, session_hash, data FROM submissions WHERE project_id = ? AND request_id = ?').bind(projectId, input.requestId).first<{ id: string; status: string; session_hash: string; data: string }>();
  if (existing) {
    if (existing.session_hash !== sessionHash) throw new HTTPException(409, { message: 'This submission reference is already in use.' });
    if (existing.status !== 'complete') throw new HTTPException(409, { message: 'Your submission is still being processed. Please wait, then retry.' });
    const saved = JSON.parse(existing.data) as SavedClaim;
    return c.json({ id: existing.id, reference: claimReference(saved), totalCents: saved.totalCents, ...reimbursement(saved), alreadySubmitted: true });
  }
  const files: TicketFile[] = [];
  let totalSize = 0;
  for (let i = 0; i < input.tickets.length; i++) {
    const file = form.get(`ticket-${i}`);
    if (!file || typeof file === 'string' || !file.size) throw new HTTPException(422, { message: `Upload the file for ticket ${i + 1}.` });
    if (file.size > MAX_FILE_SIZE) throw new HTTPException(413, { message: `Ticket ${i + 1} exceeds 10 MB.` });
    totalSize += file.size;
    if (totalSize > MAX_TOTAL_SIZE) throw new HTTPException(413, { message: 'Total uploads exceed 40 MB.' });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' ? 'application/pdf'
      : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : null;
    if (!type || type !== file.type) throw new HTTPException(422, { message: `Ticket ${i + 1}: use a valid PDF, PNG, or JPEG file.` });
    files.push({ bytes, type, name: file.name.slice(0, 180) });
  }
  const tickets = [];
  for (const [i, ticket] of input.tickets.entries()) {
    const rate = await historicalRate(c.env.DB, ticket.currency, ticket.purchaseDate);
    tickets.push({ ...rate, ...ticket, serial: i + 1, euroCents: euroCents(ticket.amount, rate.rate), filename: files[i].name });
  }
  const details = projectDetailsSchema.safeParse(row.details);
  if (!details.success || !Object.hasOwn(details.data.countryLimits, input.participant.team) || !details.data.countryCodes[input.participant.team]) throw new HTTPException(422, { message: 'The organizer must configure activity details and the country reimbursement limit before submission.' });
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const claim: SavedClaim = { projectShortName: details.data.shortName, declarationText, reference: submissionReference(details.data.shortName, details.data.countryCodes[input.participant.team], input.participant.firstName, input.participant.lastName, createdAt), activityStartDate: details.data.activityStartDate, activityEndDate: details.data.activityEndDate, destinationCity: details.data.destinationCity, countryLimitCents: details.data.countryLimits[input.participant.team], extraCents: 0, id, projectId, projectName: project.title, projectCode: row.project_code, participant: input.participant, tickets, totalCents: tickets.reduce((sum, t) => sum + t.euroCents, 0), signature: input.signature, declaration: true, createdAt };
  const prefix = `reimbursements/${projectId}/${id}`;
  const pdfKey = `${prefix}/complete.pdf`;
  const inserted = await c.env.DB.prepare('INSERT OR IGNORE INTO submissions (id, project_id, request_id, session_hash, name, team, email, total_cents, data, pdf_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, projectId, input.requestId, sessionHash, claim.participant.name, claim.participant.team, claim.participant.email, claim.totalCents, JSON.stringify(claim), pdfKey, claim.createdAt).run();
  if (!inserted.meta.changes) throw new HTTPException(409, { message: 'This submission is already processing. Please wait and retry.' });
  const storedKeys: string[] = [];
  try {
    let pdf;
    try { pdf = await generatePdf(claim, files); }
    catch { throw new HTTPException(422, { message: 'A ticket or signature could not be read. Use unencrypted PDFs with up to 10 pages, or valid PNG/JPEG images up to 25 megapixels, then retry.' }); }
    for (const [i, file] of files.entries()) {
      const key = `${prefix}/ticket-${i + 1}`;
      storedKeys.push(key);
      await c.env.FILES.put(key, file.bytes, { httpMetadata: { contentType: file.type } });
    }
    storedKeys.push(pdfKey);
    await c.env.FILES.put(pdfKey, pdf, { httpMetadata: { contentType: 'application/pdf' } });
    await c.env.DB.prepare("UPDATE submissions SET status = 'complete' WHERE id = ?").bind(id).run();
  } catch (error) {
    await c.env.FILES.delete(storedKeys);
    await c.env.DB.prepare('DELETE FROM submissions WHERE id = ?').bind(id).run();
    throw error;
  }
  return c.json({ id, reference: claimReference(claim), totalCents: claim.totalCents, ...reimbursement(claim) }, 201);
});

app.post('/api/admin/login', async c => {
  await rateLimit(c, 'admin-login', 8);
  if (!c.env.ADMIN_PASSWORD_HASH) throw new HTTPException(503, { message: 'Administrator access has not been configured yet.' });
  const { password } = z.object({ password: z.string().min(1).max(256) }).parse(await c.req.json());
  if (!await verifyPassword(password, c.env.ADMIN_PASSWORD_HASH)) throw new HTTPException(401, { message: 'Incorrect administrator password.' });
  await newSession(c, 'admin');
  return c.json({ ok: true });
});
app.use('/api/admin/*', async (c, next) => { await requireSession(c); await next(); });
app.get('/api/admin/session', c => c.json({ ok: true }));
app.post('/api/admin/logout', async c => {
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(c.get('sessionHash')).run();
  deleteCookie(c, 'ijbk_admin', { path: '/api' });
  return c.json({ ok: true });
});
app.get('/api/admin/projects', async c => {
  return c.json(await Promise.all(projects.filter(p => p.status === 'Upcoming').map(async p => ({ ...p, settings: publicSettings(await settings(c.env.DB, p.id)) }))));
});
app.put('/api/admin/projects/:id', async c => {
  const id = c.req.param('id');
  const old = await settings(c.env.DB, id);
  const input = settingsSchema.parse(await c.req.json());
  const accessHash = input.accessCode ? await hashPassword(input.accessCode) : old?.access_hash;
  if (!accessHash) throw new HTTPException(422, { message: 'Set a secret access code for this project.' });
  const queries = [c.env.DB.prepare('INSERT INTO project_settings (project_id, project_code, countries, access_hash, enabled) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET project_code = excluded.project_code, countries = excluded.countries, access_hash = excluded.access_hash, enabled = excluded.enabled')
    .bind(id, input.projectCode, JSON.stringify(input.countries), accessHash, input.enabled ? 1 : 0)];
  queries.push(c.env.DB.prepare('INSERT INTO project_details (project_id, data) VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET data = excluded.data').bind(id, JSON.stringify(projectDetailsSchema.parse(input))));
  if (input.accessCode || !input.enabled) queries.push(c.env.DB.prepare('DELETE FROM sessions WHERE project_id = ?').bind(id));
  await c.env.DB.batch(queries);
  return c.json(publicSettings(await settings(c.env.DB, id)));
});
app.get('/api/admin/projects/:id/submissions', async c => {
  projectById(c.req.param('id'));
  const rows = await c.env.DB.prepare("SELECT id, name, team, email, total_cents AS totalCents, created_at AS createdAt, data FROM submissions WHERE project_id = ? AND status = 'complete' ORDER BY created_at DESC").bind(c.req.param('id')).all();
  return c.json(rows.results.map(({ data, ...summary }) => { const claim = JSON.parse(data as string) as SavedClaim; return { ...summary, reference: claimReference(claim), finalCents: reimbursement(claim).finalCents }; }));
});
app.get('/api/admin/submissions/:id', async c => {
  const row = await c.env.DB.prepare("SELECT data FROM submissions WHERE id = ? AND status = 'complete'").bind(c.req.param('id')).first<{ data: string }>();
  if (!row) throw new HTTPException(404, { message: 'Submission not found.' });
  const claim = JSON.parse(row.data) as SavedClaim;
  return c.json({ ...claim, reference: claimReference(claim) });
});
async function savedSubmission(db: D1Database, id: string) {
  const row = await db.prepare("SELECT data, pdf_key FROM submissions WHERE id = ? AND status = 'complete'").bind(id).first<{ data: string; pdf_key: string }>();
  if (!row) throw new HTTPException(404, { message: 'Submission not found.' });
  return { ...row, claim: JSON.parse(row.data) as SavedClaim };
}
async function claimFiles(bucket: R2Bucket, claim: SavedClaim): Promise<TicketFile[]> {
  return Promise.all(claim.tickets.map(async (ticket, i) => {
    const file = await bucket.get(`reimbursements/${claim.projectId}/${claim.id}/ticket-${i + 1}`);
    if (!file) throw new HTTPException(503, { message: 'A saved ticket is unavailable. Please retry.' });
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.httpMetadata!.contentType as TicketFile['type'], name: ticket.filename };
  }));
}
app.get('/api/admin/submissions/:id/pdf-tickets', async c => {
  const { claim } = await savedSubmission(c.env.DB, c.req.param('id'));
  const entries = await Promise.all(claim.tickets.map(async ticket => {
    const file = await c.env.FILES.head(`reimbursements/${claim.projectId}/${claim.id}/ticket-${ticket.serial}`);
    if (file?.httpMetadata?.contentType?.startsWith('image/')) return null;
    return { serial: ticket.serial, filename: ticket.filename, from: ticket.from, to: ticket.to, amount: ticket.amount, currency: ticket.currency,
      url: `/api/admin/submissions/${claim.id}/tickets/${ticket.serial}`,
      ...(!file || file.httpMetadata?.contentType !== 'application/pdf' ? { error: 'Original attachment could not be identified or is unavailable.' } : {}) };
  }));
  return c.json({ participant: claim.participant.name, tickets: entries.filter(Boolean), skippedImages: entries.filter(e => e === null).length });
});
app.get('/api/admin/submissions/:id/tickets/:serial', async c => {
  const { claim } = await savedSubmission(c.env.DB, c.req.param('id'));
  const serial = c.req.param('serial');
  if (!/^[1-9][0-9]*$/.test(serial) || !claim.tickets.some(t => t.serial === Number(serial))) throw new HTTPException(404, { message: 'Ticket not found.' });
  const file = await c.env.FILES.get(`reimbursements/${claim.projectId}/${claim.id}/ticket-${serial}`);
  if (!file) throw new HTTPException(404, { message: 'Original PDF is unavailable.' });
  if (file.httpMetadata?.contentType !== 'application/pdf') throw new HTTPException(415, { message: 'Only PDF tickets are scanned. Images are excluded.' });
  c.header('Content-Type', 'application/pdf'); c.header('Content-Disposition', `attachment; filename="ticket-${serial}.pdf"`);
  return c.body(file.body);
});
app.put('/api/admin/submissions/:id/extra', async c => {
  const row = await savedSubmission(c.env.DB, c.req.param('id'));
  const input = extraSchema.parse(await c.req.json());
  const claim = { ...row.claim, extraCents: input.extraCents, extraNote: input.note, extraApprovedAt: new Date().toISOString() };
  // Validate the updated document before committing. Downloads are generated from
  // the saved claim, so the PDF and approved amount always use the same snapshot.
  await generatePdf(claim, await claimFiles(c.env.FILES, claim));
  const result = await c.env.DB.prepare("UPDATE submissions SET data = ? WHERE id = ? AND status = 'complete' AND data = ?").bind(JSON.stringify(claim), claim.id, row.data).run();
  if (!result.meta.changes) throw new HTTPException(409, { message: 'This submission changed. Refresh before approving again.' });
  return c.json(claim);
});
app.delete('/api/admin/submissions/:id', async c => {
  const row = await c.env.DB.prepare('SELECT data, pdf_key, status FROM submissions WHERE id = ?').bind(c.req.param('id')).first<{ data: string; pdf_key: string; status: string }>();
  if (!row) throw new HTTPException(404, { message: 'Submission not found.' });
  if (!['complete', 'deleting'].includes(row.status)) throw new HTTPException(409, { message: 'This submission is still processing. Please retry after it completes.' });
  const claim = JSON.parse(row.data) as SavedClaim;
  await c.env.DB.prepare("UPDATE submissions SET status = 'deleting' WHERE id = ?").bind(claim.id).run();
  await c.env.FILES.delete([row.pdf_key, ...claim.tickets.map((_, i) => `reimbursements/${claim.projectId}/${claim.id}/ticket-${i + 1}`)]);
  await c.env.DB.prepare('DELETE FROM submissions WHERE id = ?').bind(claim.id).run();
  return c.json({ ok: true });
});
app.get('/api/admin/submissions/:id/pdf', async c => {
  const { claim } = await savedSubmission(c.env.DB, c.req.param('id'));
  const pdf = await generatePdf(claim, await claimFiles(c.env.FILES, claim));
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="Reimbursement Declaration.pdf"; filename*=UTF-8''${encodeURIComponent(pdfFilename(claim))}`);
  return c.body(pdf.buffer as ArrayBuffer);
});
app.all('/api/*', c => c.json({ error: 'Endpoint not found.' }, 404));
app.get('*', async c => {
  if (!c.env.ASSETS) return c.text('Run the website with npm run dev.', 404);
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.status === 404 && !new URL(c.req.url).pathname.split('/').pop()?.includes('.')) return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw));
  return response;
});
app.onError((error, c) => {
  if (error instanceof ZodError) return c.json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, 422);
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return c.json({ error: 'The form could not be read. Please try again.' }, 400);
  // Do not log requests, bank details, signatures, or uploaded documents.
  console.error('Reimbursement request failed:', error.name);
  return c.json({ error: 'The reimbursement service is temporarily unavailable. Your form is still here; please retry.' }, 500);
});
export default app;
