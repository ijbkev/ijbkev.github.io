import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, RefreshCw, ExternalLink, Users, Plus, Settings2, Search, Globe, LockKeyhole, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Field, SelectField } from './Field';
import { api } from '@/lib/reimbursement-api';
import { projects } from '@/data/projects';
import { driveInvitationMessage, drivePersonSchema, type DriveDashboard, type DriveParticipant } from '../../../shared/project-drive';

export default function ProjectDriveAdmin({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-drive', projectId], queryFn: () => api<DriveDashboard>(`/admin/projects/${projectId}/drive`, { cache: 'no-store' }), retry: false, refetchOnWindowFocus: false });
  const [activeTab, setActiveTab] = useState('folders');
  const [search, setSearch] = useState('');
  const [url, setUrl] = useState('');
  const [editingConnection, setEditingConnection] = useState(false);
  const [folderType, setFolderType] = useState('auto');
  const [renameTarget, setRenameTarget] = useState('');
  const [folderName, setFolderName] = useState('');
  const [country, setCountry] = useState('');
  const [notifyParticipant, setNotifyParticipant] = useState(false);
  const [participantCount, setParticipantCount] = useState('1');
  const [participants, setParticipants] = useState([{ name: '', email: '' }]);
  const count = Number(participantCount);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 100;
  function updateParticipant(index: number, field: 'name' | 'email', value: string) {
    setParticipants(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }
  function changeParticipantCount(value: string) {
    setParticipantCount(value);
    const nextCount = Number(value);
    if (Number.isInteger(nextCount) && nextCount >= 1 && nextCount <= 100) {
      // Keep hidden entries so reducing the count does not discard typed names.
      setParticipants(rows => Array.from({ length: Math.max(rows.length, nextCount) }, (_, i) => rows[i] ?? { name: '', email: '' }));
    }
  }
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
    finally {
      setBusy('Refreshing folders…');
      try { await invalidate(); } finally { setBusy(''); }
    }
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
  async function savePerson(row: DriveParticipant) {
    const input = drivePersonSchema.safeParse({ folderId: row.folderId, country: row.country, name: row.name, email: currentEmail(row).trim().toLowerCase() });
    if (!input.success) throw new Error('Enter a country, name and valid email. Existing folders may have an empty email for owner-only access.');
    await api(`${endpoint}/participants`, { method: 'POST', body: JSON.stringify(input.data) });
  }
  async function browsing() { await api(`${endpoint}/browsing`, { method: 'POST' }); }
  async function add(event: FormEvent) {
    event.preventDefault();
    await run('Preparing participant folders…', async () => {
      if (!validCount) throw new Error('Enter a participant count from 1 to 100.');
      const inputs = participants.slice(0, count).map((person, index) => {
        const input = drivePersonSchema.safeParse({ country, ...person, notifyParticipant, email: person.email.trim().toLowerCase() });
        if (!input.success || !input.data.email) throw new Error(`Participant ${index + 1}: enter a name and valid email, and check the country.`);
        return input.data;
      });
      const names = inputs.map(person => person.name.toLowerCase());
      if (new Set(names).size !== names.length) throw new Error('Use a different folder name for each participant in this country.');
      let saved = 0;
      try {
        for (const person of inputs) {
          setBusy(`Creating participant ${saved + 1} of ${inputs.length}: ${person.name}…`);
          await api(`${endpoint}/participants`, { method: 'POST', body: JSON.stringify(person) });
          saved++;
        }
      } catch (reason) {
        setParticipants(participants.slice(saved));
        setParticipantCount(String(inputs.length - saved));
        setMessage(`${saved} of ${inputs.length} participant folders fully saved. The failed request may have created a folder. Check the refreshed list below; if it appears there, apply its email and access on that row. Unfinished entries are preserved.`);
        throw reason;
      }
      setParticipants([{ name: '', email: '' }]);
      setParticipantCount('1');
      const summary = `${saved} participant folder${saved === 1 ? '' : 's'} saved`;
      setMessage(`${summary} with private access.`);
      setBusy('Verifying folders and enabling country browsing…');
      try { await browsing(); setMessage(`${summary}. Country folders are viewable by anyone with the link. Personal folders remain private.`); }
      catch (reason) { setMessage(`${summary} with private access. Use “Check privacy & make countries public” to retry country browsing.`); throw reason; }
    });
  }

  async function saveRow(row: DriveParticipant) {
    await run(`Applying access for ${row.name}…`, async () => {
      await savePerson(row); setMessage(`Private access applied to ${row.name}.`);
      try { await browsing(); setMessage(`Private access applied to ${row.name}. Country folders are viewable by anyone with the link. Personal folders remain private.`); }
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
      setMessage('Private access applied. Anyone with the link can browse country folders. Only the assigned participant and owner can open each personal folder.');
    });
  }
  const disabled = !!busy || !query.data?.connected;
  const rows = query.data?.participants ?? [];
  const unsaved = rows.filter(row => currentEmail(row) !== row.email).length;
  const needsSetup = rows.filter(row => row.status === 'Needs privacy setup').length;
  const term = search.trim().toLocaleLowerCase();
  const groups = (query.data?.countries ?? []).map(item => ({
    ...item,
    rows: rows.filter(row => row.countryId === item.id && (!term || `${row.country} ${row.name} ${currentEmail(row)}`.toLocaleLowerCase().includes(term))),
  })).filter(group => !term || group.rows.length || group.name.toLocaleLowerCase().includes(term));
  return <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby="project-drive-heading">
    <div className="border-b bg-slate-50/80 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-100 p-3 text-blue-700"><FolderOpen className="h-6 w-6" /></span><div><h2 id="project-drive-heading" className="text-xl font-semibold">Participant Drive folders</h2><p className="mt-1 text-sm text-muted-foreground">One place for country folders, participant access, and invitations.</p></div></div>
        {refreshButton}
      </div>
      {query.data?.configured && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4 text-blue-600" /><strong>{query.data.countries.length}</strong> countries</span>
        <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /><strong>{rows.length}</strong> participants</span>
        {needsSetup > 0 && <span className="inline-flex items-center gap-2 text-amber-800"><AlertCircle className="h-4 w-4" />{needsSetup} awaiting privacy setup</span>}
        {unsaved > 0 && <span className="text-amber-800">{unsaved} unsaved email{unsaved === 1 ? '' : 's'}</span>}
      </div>}
    </div>
    <div className="space-y-5 p-5 md:p-6">
      {busy && <p role="status" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><RefreshCw className="h-4 w-4 shrink-0 animate-spin" />{busy}</p>}
      {message && <p role="status" className="rounded-xl border bg-muted/40 p-4 text-sm">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {query.isPending && <p role="status">Reading project folders…</p>}
      {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message}</p>}
      {query.data && !query.data.connected && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">The organizer’s Google Drive connection must be configured on this server before folders can be managed.</p>}
      {!query.data?.configured && <form onSubmit={configure} className="rounded-xl border p-4 space-y-4"><Field id="drive-folder-url" label="Google Drive folder link" type="url" required value={url} onChange={e => setUrl(e.target.value)} disabled={disabled} /><SelectField id="drive-folder-type" label="What does this link open?" value={folderType} onChange={e => setFolderType(e.target.value)} disabled={disabled}><option value="auto">Detect automatically</option><option value="project">Project folder — find Countries inside</option><option value="countries">Countries folder — read countries directly inside</option></SelectField><p className="text-xs text-muted-foreground">Paste the project folder or the folder containing your countries. A Countries folder can have any name when selected explicitly. Connecting reads existing folders; permissions change only when you apply access below.</p><div className="flex gap-3"><Button type="submit" disabled={disabled || !url.trim()}>Save Drive link &amp; read folders</Button>{query.data?.configured && <Button type="button" variant="outline" disabled={!!busy} onClick={() => { setEditingConnection(false); setUrl(''); }}>Cancel</Button>}</div></form>}
      {query.data?.configured && <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="folders" className="gap-2 rounded-lg px-2 py-3"><FolderOpen className="hidden h-4 w-4 sm:block" />Folders</TabsTrigger>
          <TabsTrigger value="add" className="gap-2 rounded-lg px-2 py-3"><Plus className="hidden h-4 w-4 sm:block" />Add people</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg px-2 py-3"><Settings2 className="hidden h-4 w-4 sm:block" />Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="folders" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-semibold">Browse by country</h3><p className="mt-1 text-sm text-muted-foreground">Open a country to manage its participants.</p></div>
            <Button disabled={disabled} onClick={() => setActiveTab('add')}><Plus className="mr-2 h-4 w-4" />Add participants</Button>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search countries, participants or emails" placeholder="Search a country, participant, or email…" value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></div>
          <p className="text-xs text-muted-foreground">Status shows the last access setup here. Use the privacy check below to verify current access.</p>
          <div className="space-y-3">
            {groups.map(group => <details key={`${group.id}-${!!term}`} open={term ? true : undefined} className="group overflow-hidden rounded-xl border">
              <summary className="cursor-pointer bg-slate-50 px-4 py-4 marker:text-blue-600"><span className="ml-2 font-semibold">{group.name}</span><span className="ml-3 text-sm text-muted-foreground">{group.rows.length} participant{group.rows.length === 1 ? '' : 's'}</span></summary>
              <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs"><span className="text-muted-foreground">Personal folders &amp; email access</span><a href={`https://drive.google.com/drive/folders/${group.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary">Open country<ExternalLink className="h-3 w-3" /></a></div>
              {!group.rows.length && <p className="border-t p-4 text-sm text-muted-foreground">{term ? 'No matching participants.' : 'No participants yet. Add people to this country to get started.'}</p>}
              {group.rows.map(row => {
                const changed = currentEmail(row) !== row.email;
                const pending = row.status === 'Needs privacy setup';
                return <div key={row.folderId} className="grid gap-4 border-t p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-start">
                  <div className="min-w-0 space-y-2">
                    <a href={`https://drive.google.com/drive/folders/${row.folderId}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-2 font-medium hover:text-primary"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="break-words">{row.name}</span><ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" /></a>
                    <div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${changed || pending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{changed || pending ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{changed ? 'Unsaved email' : pending ? 'Needs privacy setup' : row.status}</span></div>
                    <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50" onClick={() => { setRenameTarget(row.folderId); setFolderName(row.name); setActiveTab('settings'); }}><Pencil className="h-3 w-3" />Rename</button>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Field id={`drive-email-${row.folderId}`} label="Assigned email" type="email" maxLength={254} placeholder="Blank for owner-only access" disabled={disabled} value={currentEmail(row)} onChange={event => setEmails(old => ({ ...old, [row.folderId]: event.target.value }))} />
                    {!row.email && row.existingEmails.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Use an existing Drive share</summary><div className="mt-2 flex flex-wrap gap-2">{row.existingEmails.map(existingEmail => <Button key={existingEmail} type="button" size="sm" variant="outline" className="h-auto max-w-full whitespace-normal break-all text-xs" disabled={disabled} onClick={() => setEmails(old => ({ ...old, [row.folderId]: existingEmail }))}>{existingEmail}</Button>)}</div></details>}
                  </div>
                  <Button size="sm" variant="outline" className="lg:mt-7" disabled={disabled} onClick={() => saveRow(row)}>Save &amp; apply access</Button>
                </div>;
              })}
            </details>)}
            {!groups.length && <div className="rounded-xl border border-dashed p-8 text-center"><FolderOpen className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="font-medium">{term ? 'No matching folders' : 'Your first country starts here'}</p><p className="mt-1 text-sm text-muted-foreground">{term ? 'Try another name or email address.' : 'Add participants and their country folder will be created automatically.'}</p></div>}
          </div>
          <div className="grid gap-4 border-t pt-5 xl:grid-cols-2">
            <div className="rounded-xl border p-4 space-y-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Save participant access</h4><p className="text-xs leading-relaxed text-muted-foreground">Save all emails across every country, apply private access, then enable public country browsing. Other direct shares are removed; a blank email keeps owner-only access.</p><Button className="h-auto w-full whitespace-normal" disabled={disabled || !rows.length} onClick={applyAll}>Save all emails &amp; apply access{unsaved ? ` (${unsaved} edited)` : ''}</Button></div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><Globe className="h-4 w-4 text-blue-700" />Make countries visible</h4><p className="text-xs leading-relaxed text-muted-foreground">Verify all personal folders are private, then let anyone with the link browse country folders. Unsaved email edits are not applied by this check.</p><Button className="h-auto w-full whitespace-normal" variant="outline" disabled={disabled} onClick={() => run('Verifying country browsing…', async () => { await browsing(); setMessage('Country folders are public by link. Every personal folder passed the privacy check.'); })}>Check privacy &amp; make countries public</Button></div>
          </div>
        </TabsContent>
        <TabsContent value="add" className="space-y-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm text-blue-950"><span className="font-semibold">After setup:</span> country folders are public by link; personal folders open only for the assigned participant and Drive owner.</div>
      <form onSubmit={add} className="space-y-5">
        <div className="border-b pb-5"><h3 className="text-lg font-semibold">Add a country’s participants</h3><p className="mt-1 text-sm text-muted-foreground">Choose one country, then enter everyone you want to add.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="drive-country" label="Country" list="drive-country-names" required maxLength={80} value={country} onChange={e => setCountry(e.target.value)} disabled={disabled} />
          <datalist id="drive-country-names">{query.data.countries.map(c => <option key={c.id} value={c.name} />)}</datalist>
          <Field id="drive-participant-count" label="How many participants do you want to add?" type="number" min={1} max={100} step={1} required value={participantCount} onChange={e => changeParticipantCount(e.target.value)} disabled={disabled} />
        </div>
        <p className="text-sm text-muted-foreground">Enter a name and email for each participant. All folders will be created under the country above.</p>
        {validCount && participants.slice(0, count).map((person, index) => <fieldset key={index} className="rounded-xl border bg-slate-50/60 p-4" disabled={disabled}>
          <legend className="px-2 text-sm font-medium">Participant {index + 1}</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`drive-person-name-${index}`} label="Participant name" required maxLength={160} value={person.name} onChange={e => updateParticipant(index, 'name', e.target.value)} />
            <Field id={`drive-person-email-${index}`} label="Participant email" type="email" required maxLength={254} value={person.email} onChange={e => updateParticipant(index, 'email', e.target.value)} />
          </div>
        </fieldset>)}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={notifyParticipant} onChange={e => setNotifyParticipant(e.target.checked)} disabled={disabled} />
          <span>Notify participants by email through Google Drive<span className="mt-1 block text-xs text-muted-foreground">Google sends a sharing email when someone is newly granted access to their personal folder. Existing access does not trigger another notification.</span></span>
        </label>
        {notifyParticipant && <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium">Message included in Google’s sharing email</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{driveInvitationMessage(participants[0]?.name.trim() || '[Participant name]', projects.find(project => project.id === projectId)?.title ?? projectId)}</p>
          <p className="text-xs text-muted-foreground">Each message uses that participant’s name and the selected project’s name.</p>
        </div>}
        <Button type="submit" disabled={disabled || !validCount}>Create {validCount ? count : ''} participant folder{count === 1 ? '' : 's'} &amp; apply access</Button>
        <p className="text-xs text-muted-foreground">Existing country folders are reused. For a name already listed below, assign the email on its row.</p>
      </form>
        </TabsContent>
        <TabsContent value="settings" className="space-y-6">
          <div><h3 className="text-lg font-semibold">Drive settings</h3><p className="mt-1 text-sm text-muted-foreground">Manage the connection or rename an existing participant.</p></div>
    {query.data?.configured && !editingConnection ? <div className="rounded-xl border bg-muted/30 p-4 space-y-3"><p className="font-medium text-sm">This project’s Drive is connected</p><a href={`https://drive.google.com/drive/folders/${query.data.countriesFolderId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">Open connected Countries folder<ExternalLink className="h-4 w-4" /></a><p className="text-xs text-muted-foreground">Existing folders load automatically. The current connection stays in place until you explicitly save a different link.</p><Button variant="outline" size="sm" disabled={disabled} onClick={() => { setUrl(`https://drive.google.com/drive/folders/${query.data.countriesFolderId}`); setFolderType('countries'); setEditingConnection(true); }}>Change Drive link</Button></div> : <form onSubmit={configure} className="rounded-xl border p-4 space-y-4"><Field id="drive-folder-url" label="Google Drive folder link" type="url" required value={url} onChange={e => setUrl(e.target.value)} disabled={disabled} /><SelectField id="drive-folder-type" label="What does this link open?" value={folderType} onChange={e => setFolderType(e.target.value)} disabled={disabled}><option value="auto">Detect automatically</option><option value="project">Project folder — find Countries inside</option><option value="countries">Countries folder — read countries directly inside</option></SelectField><p className="text-xs text-muted-foreground">Paste the project folder or the folder containing your countries. A Countries folder can have any name when selected explicitly. Connecting reads existing folders; permissions change only when you apply access below.</p><div className="flex gap-3"><Button type="submit" disabled={disabled || !url.trim()}>Save Drive link &amp; read folders</Button>{query.data?.configured && <Button type="button" variant="outline" disabled={!!busy} onClick={() => { setEditingConnection(false); setUrl(''); }}>Cancel</Button>}</div></form>}
    {query.data?.configured && query.data.connected && <form className="rounded-xl border p-4 space-y-3" onSubmit={event => { event.preventDefault(); run('Renaming Drive folder…', async () => { await api(`${endpoint}/rename`, { method: 'POST', body: JSON.stringify({ name: folderName, folderId: renameTarget }) }); setFolderName(''); setMessage('Folder renamed in Google Drive. Its link, contents and access stay the same.'); }); }}>
      <h3 className="font-semibold">Rename a participant folder</h3><SelectField id="rename-drive-target" label="Participant to rename" value={renameTarget} onChange={e => { setRenameTarget(e.target.value); setFolderName(query.data.participants.find(row => row.folderId === e.target.value)?.name ?? ''); }} disabled={disabled}><option value="">Select a participant</option>{query.data.participants.map(row => <option key={row.folderId} value={row.folderId}>{row.country} / {row.name}</option>)}</SelectField><Field id="rename-drive-name" label="New participant name" value={folderName} onChange={e => setFolderName(e.target.value)} required maxLength={160} disabled={disabled} /><Button type="submit" disabled={disabled || !renameTarget || !folderName.trim()}>Rename participant</Button><p className="text-xs text-muted-foreground">Changes the participant’s folder name in Google Drive and updates their name in this dashboard.</p>
    </form>}

          <details className="rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-medium">How folder access works</summary><div className="mt-3 space-y-2 text-muted-foreground"><p>Countries are public by link after every personal folder passes its privacy check. Personal folders can be opened only by their assigned email and the Drive owner.</p><p>Applying access removes other direct shares, including public links, from personal folders and their contents. Existing files are preserved. Google may show other folder names greyed out.</p></div></details>
        </TabsContent>
      </Tabs>}
    </div>
  </section>;
}
