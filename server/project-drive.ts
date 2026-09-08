import { HTTPException } from 'hono/http-exception';
import defaults from './drive-defaults.json';
import type { DriveDashboard, DrivePersonInput, DriveParticipant } from '../shared/project-drive';
export interface DriveSecrets { GOOGLE_DRIVE_CLIENT_ID?: string; GOOGLE_DRIVE_CLIENT_SECRET?: string; GOOGLE_DRIVE_REFRESH_TOKEN?: string }
export type DriveFile = { id: string; name: string; mimeType: string; parents?: string[]; ownedByMe?: boolean; driveId?: string; inheritedPermissionsDisabled?: boolean; writersCanShare?: boolean; trashed?: boolean };
export type DrivePermission = { id: string; type: string; emailAddress?: string; role: string; view?: string; permissionDetails?: { inherited: boolean }[] };
const FOLDER = 'application/vnd.google-apps.folder';
const fields = 'id,name,mimeType,parents,ownedByMe,driveId,inheritedPermissionsDisabled,writersCanShare,trashed';
const equal = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
function fail(message: string): never { throw new HTTPException(409, { message }); }
export const driveConnected = (env: DriveSecrets) => !!(env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_REFRESH_TOKEN);
export async function countriesFolder(db: D1Database, projectId: string) {
  const row = await db.prepare('SELECT countries_folder_id FROM drive_projects WHERE project_id = ?').bind(projectId).first<{ countries_folder_id: string }>();
  return row?.countries_folder_id ?? (defaults as Record<string, string>)[projectId] ?? '';
}
export class GoogleDrive {
  constructor(private token: string, private transport: typeof fetch = fetch, private pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {}
  static async connect(env: DriveSecrets) {
    if (!driveConnected(env)) throw new HTTPException(503, { message: 'Google Drive is not connected on this server. Configure the organizer’s Google connection first.' });
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.GOOGLE_DRIVE_CLIENT_ID!, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET!, refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN! }), signal: AbortSignal.timeout(20000) });
    const data = await response.json() as { access_token?: string };
    if (!response.ok || !data.access_token) throw new HTTPException(503, { message: 'The Google Drive connection has expired or was revoked. Reconnect the organizer’s account.' });
    return new GoogleDrive(data.access_token);
  }
  async api<T>(path: string, method = 'GET', query: Record<string, string> = {}, body?: unknown): Promise<T> {
    const url = new URL(`https://www.googleapis.com/drive/v3/${path}`); url.search = new URLSearchParams(query).toString();
    for (let attempt = 0; ; attempt++) {
      const response = await this.transport(url, { method, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) });
      if (response.ok) return response.status === 204 ? undefined as T : await response.json() as T;
      // A retried deletion may already have succeeded on Google's side.
      if (attempt > 0 && method === 'DELETE' && response.status === 404) return undefined as T;
      const data = await response.json().catch(() => null) as { error?: { errors?: { reason?: string }[] } } | null;
      const reason = data?.error?.errors?.[0]?.reason ?? '';
      const temporary = [429, 500, 502, 503, 504].includes(response.status) || (response.status === 403 && ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason));
      // Creation is not replayed: an ambiguous success could create duplicate folders.
      if (temporary && ['GET', 'PATCH', 'DELETE'].includes(method) && attempt < 3) {
        await this.pause(1000 * 2 ** attempt + Math.floor(Math.random() * 250)); continue;
      }
      const detail = /^[a-zA-Z0-9_]{1,80}$/.test(reason) ? `; ${reason}` : '';
      throw new HTTPException(502, { message: `Google Drive failed during ${method} ${path} (${response.status}${detail})${attempt ? ' after 3 retries' : ''}. Changes may be partial; refresh and retry. ${temporary ? 'Google reported a temporary server or rate-limit error.' : 'Check folder access and the Google connection.'}` });
    }
  }

  file(id: string) { return this.api<DriveFile>(`files/${encodeURIComponent(id)}`, 'GET', { fields }); }
  async children(id: string): Promise<DriveFile[]> {
    const result: DriveFile[] = []; let pageToken = '';
    do {
      const page = await this.api<{ files: DriveFile[]; nextPageToken?: string }>('files', 'GET', { q: `'${id.replace(/'/g, "\\'")}' in parents and trashed = false`, fields: `nextPageToken,files(${fields})`, pageSize: '1000', ...(pageToken ? { pageToken } : {}) });
      result.push(...page.files); pageToken = page.nextPageToken ?? '';
      if (result.length > 5000) fail('This folder is too large for one operation. Contact the organizer.');
    } while (pageToken);
    return result;
  }
  async permissions(id: string): Promise<DrivePermission[]> {
    const result: DrivePermission[] = []; let pageToken = '';
    do {
      const page = await this.api<{ permissions: DrivePermission[]; nextPageToken?: string }>(`files/${id}/permissions`, 'GET', { fields: 'nextPageToken,permissions(id,type,emailAddress,role,view,permissionDetails(inherited))', pageSize: '100', ...(pageToken ? { pageToken } : {}) });
      result.push(...page.permissions); pageToken = page.nextPageToken ?? '';
    } while (pageToken);
    return result;
  }
  owned(file: DriveFile) {
    if (!file.ownedByMe || file.driveId || file.trashed) fail(`The connected organizer must own “${file.name}” in My Drive. No ownership changes will be made.`);
  }
  async create(name: string, parent: string) {
    // Start every new folder private, before granting any participant access.
    return this.api<DriveFile>('files', 'POST', { fields }, { name, parents: [parent], mimeType: FOLDER, inheritedPermissionsDisabled: true, writersCanShare: false });
  }
  async tree(root: DriveFile) {
    const result: DriveFile[] = []; const queue = [root]; const seen = new Set<string>();
    while (queue.length) {
      const file = queue.shift()!; if (seen.has(file.id)) fail('Unexpected repeated folder.'); seen.add(file.id); result.push(file);
      this.owned(file);
      if (file.mimeType === 'application/vnd.google-apps.shortcut') fail(`Remove the shortcut “${file.name}” before applying privacy; its target may be outside this project.`);
      if (file.mimeType === FOLDER) queue.push(...await this.children(file.id));
      if (result.length > 500) fail('This participant has more than 500 items. Split the privacy update into a smaller folder.');
    }
    return result;
  }
  async privacySettings(file: DriveFile, limited = true) {
    // Apply independent settings separately and avoid replaying an already-applied value.
    const current = await this.file(file.id);
    for (const [key, value] of Object.entries({ ...(file.mimeType === FOLDER ? { inheritedPermissionsDisabled: limited } : {}), writersCanShare: false })) {
      if (current[key as keyof DriveFile] === value) continue;
      try { await this.api(`files/${file.id}`, 'PATCH', { fields: 'id' }, { [key]: value }); }
      catch (error) { fail(`Could not update ${key} for “${file.name}”. ${(error as Error).message}`); }
    }
  }
  async restrict(root: DriveFile, email: string) {
    const tree = await this.tree(root); // Validate ownership of all content before changing any access.
    for (const file of tree) {
      await this.privacySettings(file);
      for (const p of await this.permissions(file.id)) {
        if (p.role === 'owner' || p.view === 'metadata' || (!!p.permissionDetails?.length && p.permissionDetails.every(d => d.inherited))) continue;
        if (p.type === 'user' && email && equal(p.emailAddress ?? '', email)) {
          if (p.role !== 'writer') await this.api(`files/${file.id}/permissions/${p.id}`, 'PATCH', { fields: 'id' }, { role: 'writer' });
          continue;
        }
        await this.api(`files/${file.id}/permissions/${p.id}`, 'DELETE');
      }
    }
    // Remove nested limited-access boundaries after removing unwanted direct shares;
    // descendants can then inherit the assigned participant's writer access.
    for (const file of tree.slice(1)) if (file.mimeType === FOLDER) await this.api(`files/${file.id}`, 'PATCH', { fields: 'id' }, { inheritedPermissionsDisabled: false });
    if (email) await this.grant(root.id, email, 'writer');
    await this.audit(root, email);
  }
  async grant(id: string, email: string, role: 'reader' | 'writer') {
    const existing = (await this.permissions(id)).find(p => p.type === 'user' && equal(p.emailAddress ?? '', email) && p.view !== 'metadata');
    if (existing?.role === 'owner') return;
    if (existing) { if (existing.role !== role) await this.api(`files/${id}/permissions/${existing.id}`, 'PATCH', { fields: 'id' }, { role }); }
    else await this.api(`files/${id}/permissions`, 'POST', { fields: 'id', sendNotificationEmail: 'false' }, { type: 'user', role, emailAddress: email });
  }
  async audit(root: DriveFile, email: string) {
    const actual = await this.file(root.id);
    if (!actual.inheritedPermissionsDisabled || actual.writersCanShare !== false) fail(`Apply private access to “${root.name}” first.`);
    for (const item of await this.tree(actual)) {
      if (item.writersCanShare !== false) fail(`Sharing is still enabled on “${item.name}”. Apply private access again.`);
      for (const p of await this.permissions(item.id)) {
        if (p.role === 'owner' || p.view === 'metadata') continue;
        if (!(p.type === 'user' && email && equal(p.emailAddress ?? '', email) && p.role === 'writer')) fail(`“${item.name}” still has access for someone other than its assigned participant. Apply private access again.`);
      }
    }
    if (email && !(await this.permissions(root.id)).some(p => equal(p.emailAddress ?? '', email) && p.role === 'writer' && !p.view)) fail(`Participant access on “${root.name}” could not be verified.`);
  }
}
export async function driveDashboard(db: D1Database, env: DriveSecrets, projectId: string): Promise<DriveDashboard> {
  const id = await countriesFolder(db, projectId);
  const base = { configured: !!id, connected: driveConnected(env), countriesFolderId: id, participants: [], countries: [] };
  if (!id || !driveConnected(env)) return base;
  const drive = await GoogleDrive.connect(env); const root = await drive.file(id); drive.owned(root);
  const countries = (await drive.children(id)).filter(f => f.mimeType === FOLDER);
  const saved = (await db.prepare('SELECT * FROM drive_participants WHERE project_id = ?').bind(projectId).all<{ folder_id: string; email: string; status: string }>()).results;
  const participants: DriveParticipant[] = [];
  for (const country of countries) for (const folder of await drive.children(country.id)) {
    if (folder.mimeType !== FOLDER) continue;
    const row = saved.find(r => r.folder_id === folder.id);
    const permissions = await drive.permissions(folder.id);
    participants.push({ folderId: folder.id, countryId: country.id, country: country.name, name: folder.name, email: row?.email ?? '', status: row?.status ?? 'Needs privacy setup', existingEmails: permissions.filter(p => p.type === 'user' && p.role !== 'owner' && !p.view && !(!!p.permissionDetails?.length && p.permissionDetails.every(d => d.inherited))).map(p => p.emailAddress ?? '').filter(Boolean) });
  }
  const parent = await projectFolder(drive, root);
  return { ...base, countriesFolderName: root.name, ...(parent ? { projectFolder: { id: parent.id, name: parent.name } } : {}), countries: countries.map(c => ({ id: c.id, name: c.name })), participants: participants.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)) };
}
function single(files: DriveFile[], name: string) { const matches = files.filter(f => equal(f.name, name)); if (matches.length > 1) fail(`More than one folder is named “${name}”. Select its existing row instead.`); return matches[0]; }
export async function configureDrive(db: D1Database, env: DriveSecrets, projectId: string, link: string, folderType: 'auto' | 'project' | 'countries' = 'auto') {
  const match = link.match(/^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]+)(?:[/?#].*)?$/) ?? link.match(/^([\w-]{10,})$/);
  if (!match) throw new HTTPException(422, { message: 'Enter a Google Drive folder link.' });
  const drive = await GoogleDrive.connect(env); let folder = await drive.file(match[1]); drive.owned(folder);
  if (folder.mimeType !== FOLDER) fail('Choose a folder.');
  if (folderType === 'project' || (folderType === 'auto' && !equal(folder.name, 'Countries'))) {
    const child = single((await drive.children(folder.id)).filter(f => f.mimeType === FOLDER), 'Countries');
    if (!child) fail('No Countries folder was found inside this project folder. If the selected folder already contains the countries, choose Countries folder as the link type.');
    folder = await drive.file(child.id); drive.owned(folder);
  }
  for (const [project, id] of Object.entries(defaults)) if (project !== projectId && id === folder.id) fail('This Countries folder belongs to a different project.');
  const assigned = await db.prepare('SELECT project_id FROM drive_projects WHERE countries_folder_id = ? AND project_id <> ?').bind(folder.id, projectId).first();
  if (assigned) fail('This Countries folder is already assigned to another project.');
  await db.prepare('INSERT INTO drive_projects(project_id,countries_folder_id) VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET countries_folder_id=excluded.countries_folder_id').bind(projectId, folder.id).run();
  return { ok: true };
}
export async function saveDrivePerson(db: D1Database, env: DriveSecrets, projectId: string, input: DrivePersonInput) {
  const rootId = await countriesFolder(db, projectId); if (!rootId) fail('Configure the project Countries folder first.');
  const drive = await GoogleDrive.connect(env); const root = await drive.file(rootId); drive.owned(root);
  const countries = (await drive.children(rootId)).filter(f => f.mimeType === FOLDER);
  let country: DriveFile | undefined; let folder: DriveFile | undefined;
  if (input.folderId) {
    folder = await drive.file(input.folderId); country = countries.find(c => folder!.parents?.includes(c.id));
    if (!country || folder.mimeType !== FOLDER || !equal(country.name, input.country) || !equal(folder.name, input.name)) fail('That folder is not the selected participant in this project. Refresh the list.');
  } else {
    if (!input.email) fail('Enter an email for a new participant.');
    country = single(countries, input.country);
    if (!country) country = await drive.create(input.country, rootId);
    drive.owned(country);
    const identity = await db.prepare('SELECT folder_id FROM drive_participants WHERE project_id=? AND country_id=? AND email=?').bind(projectId, country.id, input.email).first<{ folder_id: string }>();
    const children = (await drive.children(country.id)).filter(f => f.mimeType === FOLDER);
    folder = identity ? children.find(f => f.id === identity.folder_id) : undefined;
    if (!folder && single(children, input.name)) fail('A folder with this name already exists. Assign its email using the existing folder row; it will not be overwritten.');
    if (!folder) folder = await drive.create(input.name, country.id);
  }
  drive.owned(country); drive.owned(folder);
  const duplicate = input.email ? await db.prepare('SELECT folder_id FROM drive_participants WHERE project_id=? AND country_id=? AND email=? AND folder_id<>?').bind(projectId, country.id, input.email, folder.id).first() : null;
  if (duplicate) fail('This email already has a folder in this country. Update that row instead.');
  await db.prepare("INSERT INTO drive_participants(folder_id,project_id,country_id,country,name,email,status) VALUES(?,?,?,?,?,?,'Needs privacy setup') ON CONFLICT(folder_id) DO UPDATE SET email=excluded.email,status=excluded.status,country=excluded.country,name=excluded.name").bind(folder.id, projectId, country.id, country.name, folder.name, input.email).run();
  await drive.restrict(folder, input.email);
  await db.prepare('UPDATE drive_participants SET status=? WHERE folder_id=?').bind(input.email ? 'Private access applied' : 'Owner only', folder.id).run();
  return { ok: true, folderId: folder.id };
}
export async function enableCountryBrowsing(db: D1Database, env: DriveSecrets, projectId: string) {
  const rootId = await countriesFolder(db, projectId); if (!rootId) fail('Configure Countries first.');
  const drive = await GoogleDrive.connect(env); const root = await drive.file(rootId); drive.owned(root);
  const countries = await drive.children(rootId); if (countries.some(c => c.mimeType !== FOLDER)) fail('Move loose files out of Countries before enabling browsing.');
  const assignments = (await db.prepare('SELECT folder_id,email FROM drive_participants WHERE project_id=?').bind(projectId).all<{ folder_id: string; email: string }>()).results;
  const rows: { country: DriveFile; emails: string[] }[] = [];
  // Fail closed: never expand parent access until every existing participant tree has been verified.
  for (const country of countries) {
    drive.owned(country); const folders = await drive.children(country.id); const emails: string[] = [];
    if (folders.some(f => f.mimeType !== FOLDER)) fail(`Move loose files out of ${country.name} before enabling browsing.`);
    for (const folder of folders) {
      const row = assignments.find(r => r.folder_id === folder.id);
      if (!row) fail(`Apply private access to ${country.name} / ${folder.name} first (leave the email empty for owner-only access).`);
      await drive.audit(folder, row.email); if (row.email) emails.push(row.email);
    }
    rows.push({ country, emails });
  }
  // Container access is read-only; only assigned participants can browse.
  for (const container of [root, ...countries]) {
    await drive.privacySettings(container);
    for (const p of await drive.permissions(container.id)) {
      if (p.role !== 'owner' && p.view !== 'metadata' && !(!!p.permissionDetails?.length && p.permissionDetails.every(d => d.inherited))) await drive.api(`files/${container.id}/permissions/${p.id}`, 'DELETE');
    }
  }
  const allEmails = [...new Set(rows.flatMap(r => r.emails))];
  for (const email of allEmails) {
    await drive.grant(rootId, email, 'reader');
    for (const { country } of rows) await drive.grant(country.id, email, 'reader');
  }
  return { ok: true, participants: allEmails.length };
}
export async function driveLock<T>(db: D1Database, action: () => Promise<T>): Promise<T> {
  // A global lease also prevents a configuration switch from racing a participant update.
  const token = crypto.randomUUID(); const now = Date.now();
  const result = await db.prepare("INSERT INTO drive_locks(lock_key,token,expires_at) VALUES('drive',?,?) ON CONFLICT(lock_key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE drive_locks.expires_at<?").bind(token, now + 3600000, now).run();
  if (!result.meta.changes) fail('Another Drive update is in progress. Wait for it to finish.');
  try { return await action(); } finally { await db.prepare("DELETE FROM drive_locks WHERE lock_key='drive' AND token=?").bind(token).run(); }
}

async function projectFolder(drive: GoogleDrive, root: DriveFile) {
  if (root.parents?.length !== 1) return undefined;
  const parent = await drive.file(root.parents[0]);
  // Never offer to rename My Drive itself or a folder the organizer does not own.
  return parent.mimeType === FOLDER && parent.ownedByMe && !parent.driveId && parent.parents?.length ? parent : undefined;
}
export async function renameDriveFolder(db: D1Database, env: DriveSecrets, projectId: string, name: string, folderId: string) {
  const id = await countriesFolder(db, projectId); if (!id) fail('Connect a Drive folder first.');
  const drive = await GoogleDrive.connect(env); const root = await drive.file(id); drive.owned(root);
  const folder = await drive.file(folderId);
  const country = (await drive.children(id)).find(f => f.mimeType === FOLDER && folder.parents?.includes(f.id));
  if (!country || folder.mimeType !== FOLDER) fail('That participant folder is not in this project. Refresh the list.');
  drive.owned(country); drive.owned(folder);
  if ((await drive.children(country.id)).some(f => f.mimeType === FOLDER && f.id !== folderId && equal(f.name, name))) fail('A participant folder with this name already exists in this country.');
  await drive.api(`files/${folder.id}`, 'PATCH', { fields: 'id,name' }, { name });
  await db.prepare('UPDATE drive_participants SET name=? WHERE folder_id=? AND project_id=?').bind(name, folder.id, projectId).run();
  return { ok: true, name, folderId: folder.id };
}
