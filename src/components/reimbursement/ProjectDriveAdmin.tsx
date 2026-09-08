import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, SelectField } from './Field';
import { api } from '@/lib/reimbursement-api';
import { drivePersonSchema, type DriveDashboard, type DriveParticipant } from '../../../shared/project-drive';

export default function ProjectDriveAdmin({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-drive', projectId], queryFn: () => api<DriveDashboard>(`/admin/projects/${projectId}/drive`, { cache: 'no-store' }), retry: false, refetchOnWindowFocus: false });
  const [url, setUrl] = useState('');
  const [editingConnection, setEditingConnection] = useState(false);
  const [folderType, setFolderType] = useState('auto');
  const [renameTarget, setRenameTarget] = useState('');
  const [folderName, setFolderName] = useState('');
  const [country, setCountry] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const endpoint = `/admin/projects/${projectId}/drive`;
  const currentEmail = (row: DriveParticipant) => emails[row.folderId] ?? row.email;
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ['admin-drive', projectId] });
    await client.invalidateQueries({ queryKey: ['participant-session', projectId] });
  };
  async function run(label: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(label); setError(''); setMessage('');
    try { await action(); }
    catch (reason) { setError((reason as Error).message); }
    finally { await invalidate(); setBusy(''); }
  }
  async function refreshFolders() {
    setError(''); setMessage('');
    const result = await query.refetch();
    if (!result.error) setMessage('Folders refreshed from Google Drive. Unsaved email edits are preserved.');
  }
  const refreshButton = <Button variant="outline" disabled={!!busy || query.isFetching} onClick={refreshFolders}><RefreshCw className={`mr-2 h-4 w-4${query.isFetching ? ' animate-spin' : ''}`} />{query.isFetching ? 'Refreshing folders…' : 'Refresh folders from Drive'}</Button>;
  async function configure(event: FormEvent) {
    event.preventDefault();
    await run('Connecting folder…', async () => { await api(endpoint, { method: 'PUT', body: JSON.stringify({ url, folderType }) }); setUrl(''); setEditingConnection(false); setEmails({}); setMessage('Countries folder connected. Existing folders are listed below.'); });
  }
  async function savePerson(row?: DriveParticipant) {
    const input = drivePersonSchema.safeParse(row ? { folderId: row.folderId, country: row.country, name: row.name, email: currentEmail(row).trim().toLowerCase() } : { country, name, email: email.trim().toLowerCase() });
    if (!input.success || (!row && !input.data.email)) throw new Error('Enter a country, name and valid email. Existing folders may have an empty email for owner-only access.');
    await api(`${endpoint}/participants`, { method: 'POST', body: JSON.stringify(input.data) });
  }
  async function browsing() { await api(`${endpoint}/browsing`, { method: 'POST' }); }
  async function add(event: FormEvent) {
    event.preventDefault();
    await run('Creating participant folder…', async () => {
      await savePerson(); setCountry(''); setName(''); setEmail(''); setMessage('Participant folder saved with private access.');
      try { await browsing(); setMessage('Participant folder saved. Country browsing is enabled.'); }
      catch (reason) { setMessage('Participant folder saved with private access. Country browsing is not updated yet.'); throw reason; }
    });
  }
  async function saveRow(row: DriveParticipant) {
    await run(`Applying access for ${row.name}…`, async () => {
      await savePerson(row); setMessage(`Private access applied to ${row.name}.`);
      try { await browsing(); setMessage(`Private access applied to ${row.name}. Country browsing is enabled.`); }
      catch (reason) { setMessage(`Private access applied to ${row.name}. Country browsing is not updated yet.`); throw reason; }
    });
  }
  async function applyAll() {
    const rows = query.data?.participants ?? [];
    // Validate every email before making the first external change.
    if (rows.some(row => !drivePersonSchema.safeParse({ folderId: row.folderId, country: row.country, name: row.name, email: currentEmail(row).trim().toLowerCase() }).success)) { setError('Correct invalid emails before applying access.'); return; }
    await run('Applying private access…', async () => {
      for (const [index, row] of rows.entries()) { setBusy(`Protecting ${index + 1} of ${rows.length}: ${row.name}…`); await savePerson(row); }
      setBusy('Verifying folders and enabling country browsing…'); await browsing();
      setMessage('Private access applied. Participants can browse countries and open only their own personal folders.');
    });
  }
  const disabled = !!busy || !query.data?.connected;
  return <section className="rounded-2xl border bg-card p-5 md:p-6 space-y-6" aria-labelledby="project-drive-heading">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="project-drive-heading" className="flex items-center gap-2 text-xl font-semibold"><FolderOpen className="h-5 w-5 text-primary" />Participant Drive folders</h2><p className="mt-2 text-sm text-muted-foreground">Manage the selected project’s country folders, participant names, and email access.</p></div>{refreshButton}</div>
    {query.data?.configured && !editingConnection ? <div className="rounded-xl border bg-muted/30 p-4 space-y-3"><p className="font-medium text-sm">This project’s Drive is connected</p><a href={`https://drive.google.com/drive/folders/${query.data.countriesFolderId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">Open connected Countries folder<ExternalLink className="h-4 w-4" /></a><p className="text-xs text-muted-foreground">Existing folders load automatically. The current connection stays in place until you explicitly save a different link.</p><Button variant="outline" size="sm" disabled={disabled} onClick={() => { setUrl(`https://drive.google.com/drive/folders/${query.data.countriesFolderId}`); setFolderType('countries'); setEditingConnection(true); }}>Change Drive link</Button></div> : <form onSubmit={configure} className="rounded-xl border p-4 space-y-4"><Field id="drive-folder-url" label="Google Drive folder link" type="url" required value={url} onChange={e => setUrl(e.target.value)} disabled={disabled} /><SelectField id="drive-folder-type" label="What does this link open?" value={folderType} onChange={e => setFolderType(e.target.value)} disabled={disabled}><option value="auto">Detect automatically</option><option value="project">Project folder — find Countries inside</option><option value="countries">Countries folder — read countries directly inside</option></SelectField><p className="text-xs text-muted-foreground">Paste the project folder or the folder containing your countries. A Countries folder can have any name when selected explicitly. Connecting reads existing folders; permissions change only when you apply access below.</p><div className="flex gap-3"><Button type="submit" disabled={disabled || !url.trim()}>Save Drive link &amp; read folders</Button>{query.data?.configured && <Button type="button" variant="outline" disabled={!!busy} onClick={() => { setEditingConnection(false); setUrl(''); }}>Cancel</Button>}</div></form>}
    {query.data?.configured && query.data.connected && <form className="rounded-xl border p-4 space-y-3" onSubmit={event => { event.preventDefault(); run('Renaming Drive folder…', async () => { await api(`${endpoint}/rename`, { method: 'POST', body: JSON.stringify({ name: folderName, folderId: renameTarget }) }); setFolderName(''); setMessage('Folder renamed in Google Drive. Its link, contents and access stay the same.'); }); }}>
      <h3 className="font-semibold">Rename a participant folder</h3><SelectField id="rename-drive-target" label="Participant to rename" value={renameTarget} onChange={e => { setRenameTarget(e.target.value); setFolderName(query.data.participants.find(row => row.folderId === e.target.value)?.name ?? ''); }} disabled={disabled}><option value="">Select a participant</option>{query.data.participants.map(row => <option key={row.folderId} value={row.folderId}>{row.country} / {row.name}</option>)}</SelectField><Field id="rename-drive-name" label="New participant name" value={folderName} onChange={e => setFolderName(e.target.value)} required maxLength={160} disabled={disabled} /><Button type="submit" disabled={disabled || !renameTarget || !folderName.trim()}>Rename participant</Button><p className="text-xs text-muted-foreground">Changes the participant’s folder name in Google Drive and updates their name in this dashboard.</p>
    </form>}
    {query.isPending && <p role="status">Reading project folders…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message}</p>}
    {query.data && !query.data.connected && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The organizer’s Google Drive connection must be configured on this server before folders can be managed.</p>}
    {query.data?.configured && query.data.connected && <>
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-950 space-y-2"><p>Applying private access removes other direct shares, including public links, from each personal folder and its existing contents. The assigned email can edit; the Drive owner keeps access. An empty email makes the folder owner-only.</p><p>Participants can view country folders but cannot open anyone else’s personal folder. Google may show other folder names greyed out. Existing files are preserved.</p></div>
      <form onSubmit={add} className="space-y-4"><h3 className="font-semibold">Add a participant</h3><div className="grid gap-4 md:grid-cols-3"><Field id="drive-country" label="Country" list="drive-country-names" required maxLength={80} value={country} onChange={e => setCountry(e.target.value)} disabled={disabled} /><datalist id="drive-country-names">{query.data.countries.map(c => <option key={c.id} value={c.name} />)}</datalist><Field id="drive-person-name" label="Participant name" required maxLength={160} value={name} onChange={e => setName(e.target.value)} disabled={disabled} /><Field id="drive-person-email" label="Participant email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={disabled} /></div><Button type="submit" disabled={disabled}>Create folder &amp; apply access</Button><p className="text-xs text-muted-foreground">Existing country folders are reused. For a name already listed below, assign the email on its row.</p></form>
      <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Existing participant folders ({query.data.participants.length})</h3>{refreshButton}</div><p className="text-xs text-muted-foreground">Refresh to read added, renamed, moved, or deleted folders from Google Drive. Sharing in Drive does not mean this dashboard has applied private access. The status records the last setup here, not a live privacy check.</p>
        {!query.data.participants.length ? <p className="text-sm text-muted-foreground">No personal folders found. Add your first participant above.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Country</th><th className="p-3">Participant</th><th className="p-3 min-w-64">Assigned email</th><th className="p-3">Last applied status</th><th className="p-3">Access</th></tr></thead><tbody>{query.data.participants.map(row => <tr key={row.folderId} className="border-b align-top"><td className="p-3">{row.country}</td><td className="p-3"><a href={`https://drive.google.com/drive/folders/${row.folderId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">{row.name}<ExternalLink className="h-3 w-3" /></a></td><td className="p-3"><input aria-label={`Email for ${row.name} in ${row.country}`} className="w-full rounded-md border bg-background p-2" type="email" maxLength={254} placeholder="Email, or blank for owner only" disabled={disabled} value={currentEmail(row)} onChange={e => setEmails(old => ({ ...old, [row.folderId]: e.target.value }))} />{!row.email && row.existingEmails.length > 0 && <p className="mt-1 text-xs text-muted-foreground break-all">Shared directly in Google Drive with: {row.existingEmails.join(', ')}. Select an email below or enter the intended email above, then apply private access.</p>}{!row.email && row.existingEmails.map(existingEmail => <Button key={existingEmail} type="button" size="sm" variant="outline" className="mt-2 mr-2 h-auto max-w-full whitespace-normal break-all" disabled={disabled} onClick={() => setEmails(old => ({ ...old, [row.folderId]: existingEmail }))}>Use {existingEmail}</Button>)}</td><td className="p-3 text-muted-foreground">{emails[row.folderId] !== undefined && emails[row.folderId] !== row.email ? 'Unsaved email' : row.status === 'Needs privacy setup' ? 'Private access not applied here yet' : row.status}</td><td className="p-3"><Button size="sm" variant="outline" disabled={disabled} onClick={() => saveRow(row)}>Apply private access</Button></td></tr>)}</tbody></table></div>}
        <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-4 space-y-2"><Button className="w-full" disabled={disabled || !query.data.participants.length} onClick={applyAll}>Save all emails &amp; apply access</Button><p className="text-xs text-muted-foreground">Use after entering or changing emails. Saves every email, makes each personal folder private, then allows participants to browse country folders.</p></div><div className="rounded-xl border p-4 space-y-2"><Button className="w-full" variant="outline" disabled={disabled} onClick={() => run('Verifying country browsing…', async () => { await browsing(); setMessage('Country browsing enabled. Every personal folder passed the privacy check.'); })}>Check access &amp; allow browsing</Button><p className="text-xs text-muted-foreground">Use when emails and private access are already saved. Checks folder privacy and enables country viewing. Does not save edited emails or fix personal-folder permissions.</p></div></div><p className="text-xs text-muted-foreground">All personal folders must pass the privacy check before new country viewing access is granted. Keep this page open until the update finishes.</p>
      </div>
    </>}
    {busy && <p role="status" className="text-sm">{busy}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
