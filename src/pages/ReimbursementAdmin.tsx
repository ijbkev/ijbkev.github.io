import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, LogOut, Download, Settings2, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, AddressField, SelectField } from '@/components/reimbursement/Field';
import PdfDownloadReview from '@/components/reimbursement/PdfDownloadReview';
import { api, ApiError } from '@/lib/reimbursement-api';
import type { Project } from '@/data/projects';
import { claimReference, euro, reimbursement, extraSchema, settingsSchema, type ProjectSettings, type ClaimSummary, type SavedClaim } from '../../shared/reimbursement';

type AdminProject = Project & { settings: ProjectSettings };
export default function ReimbursementAdmin() {
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['admin-session'], queryFn: () => api('/admin/session'), retry: false, refetchOnWindowFocus: false });
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); setPassword(''); await client.invalidateQueries({ queryKey: ['admin-session'] }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    setError('');
    try { await api('/admin/logout', { method: 'POST' }); client.removeQueries({ queryKey: ['admin-projects'] }); client.removeQueries({ queryKey: ['admin-submissions'] }); client.removeQueries({ queryKey: ['admin-claim'] }); await client.invalidateQueries({ queryKey: ['admin-session'] }); }
    catch (e) { setError((e as Error).message); }
  }
  return <div className="page-shell py-12 md:py-16 space-y-8">
    <header className="flex items-start justify-between gap-4"><div className="space-y-3"><p className="text-sm uppercase tracking-[0.18em] text-primary flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Administrator</p><h1 className="text-3xl md:text-4xl font-semibold">Project reimbursements</h1><p className="text-muted-foreground">Manage participant access and download completed claims.</p></div>{session.isSuccess && <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" />Sign out</Button>}</header>
    {session.isPending ? <p role="status">Checking administrator access…</p> : session.isSuccess ? <Dashboard /> : <form onSubmit={login} className="max-w-md mx-auto rounded-2xl border bg-card p-8 space-y-5"><ShieldCheck className="w-10 h-10 text-primary" /><h2 className="text-2xl font-semibold">Administrator sign-in</h2><p className="text-sm text-muted-foreground">Use your administrator password. Participant project codes cannot access this dashboard.</p><Field id="admin-password" label="Administrator password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={256} disabled={busy} /><Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>{session.error instanceof ApiError && session.error.status !== 401 && <p role="alert" className="text-sm text-destructive">{session.error.message}</p>}</form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

function Dashboard() {
  const query = useQuery({ queryKey: ['admin-projects'], queryFn: () => api<AdminProject[]>('/admin/projects'), retry: false });
  const [projectId, setProjectId] = useState('');
  const project = query.data?.find(p => p.id === projectId) ?? query.data?.[0];
  if (query.isPending) return <p role="status">Loading projects…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  return <div className="space-y-8"><div className="max-w-lg"><SelectField id="admin-project" label="Project" value={project?.id ?? ''} onChange={e => setProjectId(e.target.value)}>{query.data.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</SelectField></div>{project && <ProjectDashboard key={project.id} project={project} />}</div>;
}

function ProjectDashboard({ project }: { project: AdminProject }) {
  const client = useQueryClient();
  const [projectCode, setProjectCode] = useState(project.settings.projectCode);
  const [countries, setCountries] = useState(project.settings.countries.join('\n'));
  const [shortName, setShortName] = useState(project.settings.shortName ?? project.id.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  const [activityStartDate, setActivityStartDate] = useState(project.settings.activityStartDate ?? '');
  const [activityEndDate, setActivityEndDate] = useState(project.settings.activityEndDate ?? '');
  const [destinationCity, setDestinationCity] = useState(project.settings.destinationCity ?? '');
  const [countryLimits, setCountryLimits] = useState<Record<string, string>>(Object.fromEntries(Object.entries(project.settings.countryLimits ?? {}).map(([country, cents]) => [country, (cents / 100).toFixed(2)])));
  const countryList = [...new Set(countries.split(/[\n,]/).map(c => c.trim()).filter(Boolean))];
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [enabled, setEnabled] = useState(project.settings.enabled);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [selected, setSelected] = useState<string | null>(null); const [downloading, setDownloading] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['admin-submissions', project.id], queryFn: () => api<ClaimSummary[]>(`/admin/projects/${project.id}/submissions`), retry: false });
  const submissions = query.data?.filter(s => `${s.name} ${s.team} ${s.email}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage(''); setError('');
    const parsed = settingsSchema.safeParse({ shortName, activityStartDate, activityEndDate, destinationCity, countryLimits: Object.fromEntries(countryList.map(c => [c, countryLimits[c]?.trim() ? Math.round(Number(countryLimits[c]) * 100) : NaN])), projectCode, countries: countries.split(/[\n,]/).map(c => c.trim()).filter(Boolean), accessCode: accessCode || undefined, enabled });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join('; ')); return; }
    setBusy(true);
    try {
      await api(`/admin/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(parsed.data) });
      setAccessCode(''); setMessage('Project settings saved. Share the secret access code with your participants.');
      await client.invalidateQueries({ queryKey: ['admin-projects'] }); await client.invalidateQueries({ queryKey: ['project-settings', project.id] });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function remove(submission: ClaimSummary) {
    if (!window.confirm(`Delete ${submission.name}'s submission and all its tickets, signature, and PDF? This cannot be undone.`)) return;
    setDeleting(submission.id); setError('');
    try { await api(`/admin/submissions/${submission.id}`, { method: 'DELETE' }); client.removeQueries({ queryKey: ['admin-claim', submission.id] }); if (selected === submission.id) setSelected(null); await client.invalidateQueries({ queryKey: ['admin-submissions', project.id] }); }
    catch (e) { setError((e as Error).message); } finally { setDeleting(null); }
  }
  function download(id: string) { setReviewId(id); }
  return <div className="space-y-8">
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
      <form onSubmit={save} className="rounded-2xl border bg-card p-6 space-y-5">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" />Project access</h2>
        <Field id="project-code" label="Project identifying code" required maxLength={120} value={projectCode} onChange={e => setProjectCode(e.target.value)} disabled={busy} placeholder="Official Erasmus+ project code" />
        <Field id="project-short-name" label="Short project name (reference prefix)" required maxLength={30} pattern="[A-Z0-9]+" value={shortName} onChange={e => setShortName(e.target.value.toUpperCase().replace(/\s/g, ''))} disabled={busy} />
        <p className="text-xs text-muted-foreground">Example reference: {shortName || 'PROJECT'}_DE_ANNA_SCHMIDT_YYYY_MM_DD. Country codes are derived automatically; dates use the submission date in UTC.</p>
        <div className="grid sm:grid-cols-2 gap-3"><Field id="activity-start" label="Activity start date" type="date" required value={activityStartDate} onChange={e => setActivityStartDate(e.target.value)} disabled={busy} /><Field id="activity-end" label="Activity end date" type="date" required min={activityStartDate || undefined} value={activityEndDate} onChange={e => setActivityEndDate(e.target.value)} disabled={busy} /></div>
        <Field id="destination-city" label="Destination city" required maxLength={120} value={destinationCity} onChange={e => setDestinationCity(e.target.value)} disabled={busy} />
        <AddressField id="countries" label="Participating countries" required value={countries} onChange={e => setCountries(e.target.value)} disabled={busy} rows={4} placeholder="One country per line" />
        <p className="text-xs text-muted-foreground">These countries appear on the project page and are the only options participants can select.</p>
        <fieldset disabled={busy} className="space-y-4"><legend className="font-semibold mb-3">Country reimbursement limits (EUR)</legend>{countryList.map((country, i) => <div key={country} className="rounded-lg border p-3 space-y-3"><p className="font-medium">{country}</p><div><Field id={`country-limit-${i}`} label="Maximum (EUR)" required type="number" min="0" max="100000000" step="0.01" placeholder="309.00" value={countryLimits[country] ?? ''} onChange={e => setCountryLimits(v => ({ ...v, [country]: e.target.value }))} /></div></div>)}</fieldset>
        <Field id="new-access-code" label={project.settings.hasAccessCode ? 'New secret access code (optional)' : 'Secret access code'} type="password" required={!project.settings.hasAccessCode} minLength={8} maxLength={128} autoComplete="new-password" value={accessCode} onChange={e => setAccessCode(e.target.value)} disabled={busy} />
        <p className="text-xs text-muted-foreground">Use at least 8 characters. Save the code before sharing it; saved codes cannot be displayed. Changing it signs out existing participant sessions. The secret code does not appear in PDFs.</p>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={busy} className="w-4 h-4 accent-primary" />Open reimbursement submissions</label>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save project settings'}</Button>
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      </form>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-blue-950 to-indigo-900 text-white p-6 md:p-8 space-y-5"><p className="text-sm text-white/70">{project.title}</p><h2 className="text-2xl font-semibold">Reimbursement overview</h2><div className="grid grid-cols-2 gap-4"><div><p className="text-3xl font-semibold">{query.data?.length ?? '—'}</p><p className="text-sm text-white/70">Submitted claims</p></div><div><p className="text-3xl font-semibold">{query.data ? euro(query.data.reduce((sum, s) => sum + s.totalCents, 0)) : '—'}</p><p className="text-sm text-white/70">Total requested</p></div></div><p className="text-sm text-white/80">Portal: {project.settings.enabled ? 'Open for participants' : 'Closed'}</p><Link to={`/projects/${project.id}`} className="inline-flex gap-2 items-center text-sm underline">Open public project page<ExternalLink className="w-4 h-4" /></Link></section>
        <section className="rounded-2xl border bg-card p-6 space-y-3"><h3 className="font-semibold">One complete PDF per participant</h3><p className="text-sm text-muted-foreground">Each download includes the participant details, travel costs, historical exchange rates, bank details, and signature, followed by every ticket on its own numbered page.</p><p className="text-sm text-muted-foreground">Changing project settings does not alter claims already submitted.</p></section>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    <section className="rounded-2xl border bg-card p-5 md:p-7 space-y-5">
      <div className="flex flex-wrap justify-between gap-4 items-center"><h2 className="text-2xl font-semibold">Participant submissions</h2><Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`w-4 h-4 mr-2 ${query.isFetching ? 'animate-spin' : ''}`} />Refresh</Button></div>
      <div className="max-w-md"><Field id="submission-search" label="Search participants" type="search" placeholder="Name, country, or email" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {query.isPending ? <p role="status">Loading submissions…</p> : query.isError ? <p role="alert" className="text-destructive">{query.error.message}</p> : submissions.length === 0 ? <div className="py-10 text-center text-muted-foreground"><Search className="w-8 h-8 mx-auto mb-3 opacity-50" /><p>{search ? 'No submissions match your search.' : 'No submissions yet. Configure access and share the project page and secret code with your participants.'}</p></div> : [...new Set(submissions.map(s => s.team))].sort((a, b) => a.localeCompare(b)).map(country => <div key={country} className="space-y-3"><h3 className="text-xl font-semibold">{country} <span className="text-sm text-muted-foreground">({submissions.filter(s => s.team === country).length})</span></h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground">{['Participant / reference', 'Submitted', 'Expenses', 'Reimbursement', 'Actions'].map(h => <th key={h} scope="col" className="py-3 px-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{submissions.filter(s => s.team === country).map(s => <tr key={s.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground break-all">{s.email}</p><p className="text-xs break-all">{s.reference ?? s.id}</p></td><td className="p-3 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-3 whitespace-nowrap">{euro(s.totalCents)}</td><td className="p-3 whitespace-nowrap font-semibold">{euro(s.finalCents ?? s.totalCents)}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(s.id)}>View details</Button><Button size="sm" onClick={() => download(s.id)} disabled={downloading === s.id}><Download className="w-4 h-4 mr-2" />{downloading === s.id ? 'Downloading…' : 'PDF'}</Button><Button size="sm" variant="destructive" onClick={() => remove(s)} disabled={deleting === s.id}>{deleting === s.id ? 'Deleting…' : 'Delete'}</Button></div></td></tr>)}</tbody></table></div></div>)}
    </section>
    {reviewId && <PdfDownloadReview key={reviewId} id={reviewId} onClose={() => setReviewId(null)} />}
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Participant reimbursement</DialogTitle><DialogDescription>Saved participant details and the final calculated travel amounts.</DialogDescription></DialogHeader>{selected && <ClaimDetails id={selected} onDownload={() => download(selected)} downloading={downloading === selected} />}</DialogContent></Dialog>
  </div>;
}
function ClaimDetails({ id, onDownload, downloading }: { id: string; onDownload: () => void; downloading: boolean }) {
  const query = useQuery({ queryKey: ['admin-claim', id], queryFn: () => api<SavedClaim>(`/admin/submissions/${id}`), retry: false });
  if (query.isPending) return <p role="status">Loading participant details…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  const c = query.data;
  const details: [string, string][] = [['Project', c.projectName], ['Project code', c.projectCode], ['Name', c.participant.name], ['Reference', claimReference(c)], ['Activity start date', c.activityStartDate ?? 'Not recorded'], ['Activity end date', c.activityEndDate ?? 'Not recorded'], ['Destination city', c.destinationCity ?? 'Not recorded'], ['City of residence', c.participant.city], ['Country of residence', c.participant.team], ['Arrival', c.participant.arrivalDate], ['Departure', c.participant.departureDate], ['Role', c.participant.role], ['Green travel', c.participant.greenTravel ? 'Yes' : 'No'], ['Notes', c.participant.notes], ['Account holder', c.participant.accountHolder], ['Bank name', c.participant.bankName], ['Place of signature', c.participant.signaturePlace], ['Citizenship', c.participant.citizenship], ['Date of birth', c.participant.dateOfBirth], ['Email', c.participant.email], ['Phone', c.participant.phone], ['Account / IBAN', c.participant.bankAccount], ['BIC / SWIFT', c.participant.bic], ['Bank address', c.participant.bankAddress], ['Participant address', c.participant.address]];
  return <div className="space-y-6"><dl className="grid sm:grid-cols-2 gap-4">{details.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{value}</dd></div>)}</dl><div className="space-y-3"><h3 className="font-semibold">Travel tickets</h3>{c.tickets.map(t => <div key={t.serial} className="rounded-lg border p-3 text-sm space-y-1"><p className="font-medium">Ticket {t.serial} · {t.mode} · {t.ticketType ?? 'Format not recorded'} · {t.from} → {t.to}</p><p>Purchased {t.purchaseDate} · Travel {t.travelDate}</p><p>{t.amount.toFixed(2)} {t.currency} = <strong>{euro(t.euroCents)}</strong></p><p className="text-xs text-muted-foreground">1 {t.currency} = {t.rate} EUR · {t.rateDate} · {t.source}</p><p className="text-xs break-all">{t.filename}</p></div>)}</div><ExtraReimbursement key={`${c.id}-${c.extraApprovedAt}`} claim={c} /><div><h3 className="font-semibold text-sm">Participant signature</h3><img src={c.signature} alt={`Signature of ${c.participant.name}`} className="max-w-full w-80 h-24 object-contain bg-white border rounded-lg mt-2" /></div><Button onClick={onDownload} disabled={downloading}><Download className="w-4 h-4 mr-2" />{downloading ? 'Downloading…' : 'Download complete PDF'}</Button></div>;
}

function ExtraReimbursement({ claim }: { claim: SavedClaim }) {
  const client = useQueryClient();
  const [amount, setAmount] = useState(((claim.extraCents ?? 0) / 100).toFixed(2));
  const [note, setNote] = useState(claim.extraNote ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const totals = reimbursement(claim);
  async function approve(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = extraSchema.safeParse({ extraCents: Math.round(Number(amount) * 100), note });
    if (!amount.trim() || !parsed.success) { setError('Enter a valid non-negative extra reimbursement amount.'); return; }
    setBusy(true);
    try { await api(`/admin/submissions/${claim.id}/extra`, { method: 'PUT', body: JSON.stringify(parsed.data) }); await client.invalidateQueries({ queryKey: ['admin-claim', claim.id] }); await client.invalidateQueries({ queryKey: ['admin-submissions', claim.projectId] }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border p-4 space-y-4"><h3 className="font-semibold">Reimbursement breakdown</h3><dl className="space-y-2 text-sm">{[['Total submitted expenses', euro(claim.totalCents)], ['Country reimbursement limit', claim.countryLimitCents === undefined ? 'Not recorded (legacy claim)' : euro(claim.countryLimitCents)], ['Approved extra reimbursement', euro(totals.extraCents)], ['Final reimbursement amount', euro(totals.finalCents)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>{claim.extraApprovedAt && <p className="text-xs text-muted-foreground">Last approval: {new Date(claim.extraApprovedAt).toLocaleString()}</p>}<form onSubmit={approve} className="space-y-3 border-t pt-4"><Field id="extra-amount" label="Extra reimbursement to approve (EUR)" type="number" min="0" max="100000000" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /><AddressField id="extra-note" label="Approval note (optional)" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /><p className="text-xs text-muted-foreground">Added to the reimbursable expenses after applying the country limit. Saving replaces the previously approved extra amount; save 0 to remove it. The PDF updates with this approval.</p><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Approve extra reimbursement'}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form></section>;
}
