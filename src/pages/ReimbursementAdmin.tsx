import { AdminPasskeys, PasskeySignIn } from '@/components/admin/AdminPasskeys';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProjectDriveAdmin from '@/components/reimbursement/ProjectDriveAdmin';
import ProjectParticipantsAdmin from '@/components/reimbursement/ProjectParticipantsAdmin';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, LogOut, Download, Settings2, ExternalLink, RefreshCw, Search, Users, Handshake, FolderOpen, ContactRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, AddressField, SelectField } from '@/components/reimbursement/Field';
import PdfDownloadReview from '@/components/reimbursement/PdfDownloadReview';
import { api, ApiError } from '@/lib/reimbursement-api';
import type { Project } from '@/data/projects';
import { allGreenTransport, greenTravelCorrectionSchema, claimReference, isReceipt, flightRoute, euro, reimbursement, extraSchema, settingsSchema, type ProjectSettings, type ClaimSummary, type SavedClaim, type OrganisationDeclarationSummary, type PartnershipAgreementSummary } from '../../shared/reimbursement';

type AdminProject = Project & { settings: ProjectSettings };
export default function ReimbursementAdmin() {
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['admin-session'], queryFn: () => api('/admin/session'), retry: false, refetchOnWindowFocus: false });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); setPassword(''); await client.invalidateQueries({ queryKey: ['admin-session'] }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    setError('');
    try { await api('/admin/logout', { method: 'POST' }); client.removeQueries({ queryKey: ['admin-drive'] }); client.removeQueries({ queryKey: ['admin-projects'] }); client.removeQueries({ queryKey: ['admin-submissions'] }); client.removeQueries({ queryKey: ['admin-claim'] }); await client.invalidateQueries({ queryKey: ['admin-session'] }); }
    catch (e) { setError((e as Error).message); }
  }
  return <div className="min-h-screen bg-slate-50/50"><div className="page-shell py-8 md:py-12 space-y-6">
    <header className="flex items-start justify-between gap-5 border-b border-slate-200 pb-6"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ShieldCheck className="h-4 w-4" />Administrator</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Project reimbursements</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">Review claims, manage project access and keep partner documents in one place.</p></div>{session.isSuccess && <Button variant="ghost" className="shrink-0 text-muted-foreground" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>}</header>
    {session.isPending ? <p role="status" className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">Checking administrator access…</p> : session.isSuccess ? <><AdminPasskeys /><Dashboard /></> : <form onSubmit={login} className="mx-auto max-w-md space-y-5 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><span className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-7 w-7" /></span><div><h2 className="text-2xl font-semibold tracking-tight">Administrator sign-in</h2><p className="mt-2 text-sm text-muted-foreground">Use your administrator password or a registered passkey.</p></div><Field id="admin-password" label="Administrator password" type={showLoginPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={256} disabled={busy} /><div className="flex items-center justify-between gap-3"><Button type="button" size="sm" variant="ghost" className="px-0 text-muted-foreground" onClick={() => setShowLoginPassword(v => !v)}>{showLoginPassword ? 'Hide password' : 'Show password'}</Button><Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button></div><div className="border-t pt-5"><PasskeySignIn disabled={busy} onSuccess={async () => { setPassword(''); setError(''); await client.invalidateQueries({ queryKey: ['admin-session'] }); }} /></div>{session.error instanceof ApiError && session.error.status !== 401 && <p role="alert" className="text-sm text-destructive">{session.error.message}</p>}</form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div></div>;
}

function Dashboard() {
  const query = useQuery({ queryKey: ['admin-projects'], queryFn: () => api<AdminProject[]>('/admin/projects'), retry: false });
  const [projectId, setProjectId] = useState('');
  const project = query.data?.find(p => p.id === projectId) ?? query.data?.[0];
  if (query.isPending) return <p role="status">Loading projects…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  return <div className="space-y-6"><div className="rounded-2xl border bg-white px-4 py-3 shadow-sm sm:flex sm:items-end sm:justify-between sm:gap-6"><div className="w-full max-w-lg"><SelectField id="admin-project" label="Active project" value={project?.id ?? ''} onChange={e => setProjectId(e.target.value)}>{query.data.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</SelectField></div><p className="mt-3 shrink-0 text-xs text-muted-foreground sm:mb-2 sm:mt-0">Choose a project to update this workspace.</p></div>{project && <ProjectDashboard key={project.id} project={project} />}</div>;
}

function OverviewMetric({ label, value, featured = false, danger = false }: { label: string; value: ReactNode; featured?: boolean; danger?: boolean }) {
  return <div className={`min-w-0 px-4 py-4 md:px-5 ${featured ? 'bg-white/[0.04]' : ''}`}><dt className="text-xs text-white/55">{label}</dt><dd className={`mt-1 truncate font-semibold tabular-nums tracking-tight ${featured ? 'text-2xl' : 'text-xl'} ${danger ? 'text-red-300' : 'text-white'}`} title={typeof value === 'string' ? value : undefined}>{value}</dd></div>;
}

function SectionHeading({ title, description, icon, actions }: { title: string; description: string; icon: ReactNode; actions?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span><div><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>{actions}</div>;
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
  const [expectedParticipants, setExpectedParticipants] = useState<Record<string, string>>(Object.fromEntries(Object.entries(project.settings.expectedParticipants ?? {}).map(([c, n]) => [c, String(n)])));
  const countryList = [...new Set(countries.split(/[\n,]/).map(c => c.trim()).filter(Boolean))];
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [partnerAccessCodes, setPartnerAccessCodes] = useState<Record<string, string | null>>({});
  const [enabled, setEnabled] = useState(project.settings.enabled);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [selected, setSelected] = useState<string | null>(null); const [downloading, setDownloading] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['admin-submissions', project.id], queryFn: () => api<ClaimSummary[]>(`/admin/projects/${project.id}/submissions`), retry: false });
  const organisationQuery = useQuery({ queryKey: ['admin-organisation-declarations', project.id], queryFn: () => api<OrganisationDeclarationSummary[]>(`/admin/projects/${project.id}/organisation-declarations`), retry: false });
  const partnershipQuery = useQuery({ queryKey: ['admin-partnership-agreements', project.id], queryFn: () => api<PartnershipAgreementSummary[]>(`/admin/projects/${project.id}/partnership-agreements`), retry: false });
  const [downloadingOrganisation, setDownloadingOrganisation] = useState<string | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);
  const submissions = query.data?.filter(s => `${s.name} ${s.team} ${s.email}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage(''); setError('');
    const parsed = settingsSchema.safeParse({ expectedParticipants: Object.fromEntries(countryList.filter(c => expectedParticipants[c]?.trim()).map(c => [c, Number(expectedParticipants[c])])), shortName, activityStartDate, activityEndDate, destinationCity, countryLimits: Object.fromEntries(countryList.map(c => [c, countryLimits[c]?.trim() ? Math.round(Number(countryLimits[c]) * 100) : NaN])), projectCode, countries: countries.split(/[\n,]/).map(c => c.trim()).filter(Boolean), accessCode: accessCode || undefined, partnerAccessCodes: Object.fromEntries(Object.entries(partnerAccessCodes).filter(([c, code]) => countryList.includes(c) && code !== '')), enabled });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join('; ')); return; }
    setBusy(true);
    try {
      await api(`/admin/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(parsed.data) });
      setAccessCode(''); setPartnerAccessCodes({}); await client.invalidateQueries({ queryKey: ['admin-access-codes', project.id] }); setMessage('Project settings saved. Share each access code only with its intended users.');
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
  async function downloadOrganisation(item: OrganisationDeclarationSummary) {
    setDownloadingOrganisation(item.id);setError('');
    try {
      const response=await fetch(`/api/admin/organisation-declarations/${encodeURIComponent(item.id)}/pdf`,{credentials:'same-origin'});
      if(!response.ok)throw new Error((await response.json() as {error?:string}).error||'The declaration PDF could not be downloaded.');
      const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=`Reimbursement Declaration - ${item.organisationName} - ${item.country}.pdf`;link.click();URL.revokeObjectURL(url);
    } catch(reason){setError((reason as Error).message);} finally{setDownloadingOrganisation(null);}
  }
  async function downloadPartnership(item: PartnershipAgreementSummary) { setDownloadingOrganisation(item.id); setError(''); try { const response = await fetch(`/api/admin/partnership-agreements/${encodeURIComponent(item.id)}/pdf`, { credentials: 'same-origin' }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error || 'The agreement PDF could not be downloaded.'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `Partnership Agreement - ${item.partnerName} - ${item.partnerCountry}.pdf`; link.click(); URL.revokeObjectURL(url); } catch (reason) { setError((reason as Error).message); } finally { setDownloadingOrganisation(null); } }
  async function deleteOrganisation(item: OrganisationDeclarationSummary) { if (!window.confirm(`Delete the reimbursement declaration from ${item.organisationName} (${item.country})? The organisation will then be able to submit a replacement.`)) return; setDeletingDocument(item.id); setError(''); try { await api(`/admin/organisation-declarations/${item.id}`, { method: 'DELETE' }); await client.invalidateQueries({ queryKey: ['admin-organisation-declarations', project.id] }); } catch (reason) { setError((reason as Error).message); } finally { setDeletingDocument(null); } }
  async function deletePartnership(item: PartnershipAgreementSummary) { if (!window.confirm(`Delete the partnership agreement from ${item.partnerName} (${item.partnerCountry})? The partner will then be able to submit a replacement.`)) return; setDeletingDocument(item.id); setError(''); try { await api(`/admin/partnership-agreements/${item.id}`, { method: 'DELETE' }); await client.invalidateQueries({ queryKey: ['admin-partnership-agreements', project.id] }); } catch (reason) { setError((reason as Error).message); } finally { setDeletingDocument(null); } }
  const countryBudgets = project.settings.countries.map(country => {
    const expected = project.settings.expectedParticipants?.[country];
    const limit = project.settings.countryLimits?.[country];
    return expected === undefined || limit === undefined ? undefined : expected * limit;
  });
  const aggregateBudgetCents = countryBudgets.some(budget => budget === undefined) ? undefined : countryBudgets.reduce((sum, budget) => sum + (budget ?? 0), 0);
  const aggregateExpenseCents = project.settings.countries.reduce((total, country) => {
    const people = [...new Map([...(query.data ?? [])].reverse().filter(s => s.team === country).map(s => [s.email.trim().toLowerCase(), s])).values()];
    return total + people.reduce((sum, person) => sum + (person.finalCents ?? person.totalCents), 0);
  }, 0);
  const aggregateRemainingCents = aggregateBudgetCents === undefined ? undefined : aggregateBudgetCents - aggregateExpenseCents;
  const totalApprovedCents = query.data?.reduce((sum, submission) => sum + (submission.approvedAt ? (submission.finalCents ?? submission.totalCents) : 0), 0);
  return <div className="space-y-6">
    {project.settings.demo && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-semibold">Local demo — dummy records only. Live participant records and Google Drive are not connected.</p>}
    <section aria-label="Reimbursement overview" className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 to-indigo-900 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-7">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Reimbursement overview</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{project.title}</h2></div>
        <div className="flex flex-wrap items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${project.settings.enabled ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-white/70'}`}><span className={`h-2 w-2 rounded-full ${project.settings.enabled ? 'bg-emerald-400' : 'bg-white/40'}`} />Portal {project.settings.enabled ? 'open' : 'closed'}</span><Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white">Public page<ExternalLink className="h-4 w-4" /></Link></div>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-3 xl:grid-cols-5">
        <OverviewMetric label="Submitted claims" value={query.data?.length ?? '—'} />
        <OverviewMetric label="Total approved" value={totalApprovedCents === undefined ? '—' : euro(totalApprovedCents)} featured />
        <OverviewMetric label="All-country budget" value={aggregateBudgetCents === undefined ? '—' : euro(aggregateBudgetCents)} />
        <OverviewMetric label="Combined expenses" value={query.data ? euro(aggregateExpenseCents) : '—'} />
        <OverviewMetric label="Budget remaining" value={aggregateRemainingCents === undefined ? '—' : euro(aggregateRemainingCents)} danger={aggregateRemainingCents !== undefined && aggregateRemainingCents < 0} featured />
      </dl>
    </section>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    <Tabs defaultValue="participants" className="space-y-5">
      <div className="overflow-x-auto pb-1"><TabsList aria-label="Admin dashboard sections" className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border bg-white p-1.5 shadow-sm">
        <TabsTrigger value="participants" className="gap-2 rounded-xl px-4 py-2.5"><Users className="h-4 w-4" />Reimbursements</TabsTrigger>
        <TabsTrigger value="partners" className="gap-2 rounded-xl px-4 py-2.5"><Handshake className="h-4 w-4" />Partner documents</TabsTrigger>
        <TabsTrigger value="directory" className="gap-2 rounded-xl px-4 py-2.5"><ContactRound className="h-4 w-4" />Participants</TabsTrigger>
        <TabsTrigger value="drive" className="gap-2 rounded-xl px-4 py-2.5"><FolderOpen className="h-4 w-4" />Drive folders</TabsTrigger>
        <TabsTrigger value="settings" className="gap-2 rounded-xl px-4 py-2.5"><Settings2 className="h-4 w-4" />Settings</TabsTrigger>
      </TabsList>
      </div>
      <TabsContent value="settings" forceMount className="data-[state=inactive]:hidden">
    <form onSubmit={save} className="space-y-5">
      <SectionHeading title="Project settings" description="Core project information, country budgets and portal access." icon={<Settings2 className="h-5 w-5" />} />
      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="min-w-0 space-y-4 rounded-2xl border bg-white p-5 shadow-sm md:p-6"><legend className="px-1 text-base font-semibold">Project details</legend>
          <Field id="project-code" label="Project identifying code" required maxLength={120} value={projectCode} onChange={e => setProjectCode(e.target.value)} disabled={busy} placeholder="Official Erasmus+ project code" />
          <Field id="project-short-name" label="Short project name (reference prefix)" required maxLength={30} pattern="[A-Z0-9]+" value={shortName} onChange={e => setShortName(e.target.value.toUpperCase().replace(/\s/g, ''))} disabled={busy} />
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">Reference preview: {shortName || 'PROJECT'}_DE_ANNA_SCHMIDT_YYYY_MM_DD</p>
          <div className="grid sm:grid-cols-2 gap-3"><Field id="activity-start" label="Activity start date" type="date" required value={activityStartDate} onChange={e => setActivityStartDate(e.target.value)} disabled={busy} /><Field id="activity-end" label="Activity end date" type="date" required min={activityStartDate || undefined} value={activityEndDate} onChange={e => setActivityEndDate(e.target.value)} disabled={busy} /></div>
          <Field id="destination-city" label="Destination city" required maxLength={120} value={destinationCity} onChange={e => setDestinationCity(e.target.value)} disabled={busy} />
        </fieldset>
        <div className="min-w-0 space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-6">
          <div><h3 className="font-semibold">Countries &amp; budgets</h3><p className="mt-1 text-sm text-muted-foreground">Set each country’s reimbursement ceiling and expected group size.</p></div>
          <AddressField id="countries" label="Participating countries" required value={countries} onChange={e => setCountries(e.target.value)} disabled={busy} rows={3} placeholder="One country per line" />
          <fieldset disabled={busy} className="space-y-3"><legend className="text-sm font-medium">Country allocations</legend>
            <div className="grid gap-3 sm:grid-cols-2">{countryList.map((country, i) => <div key={country} className="space-y-3 rounded-xl border bg-slate-50/70 p-3"><p className="text-sm font-semibold">{country}</p><Field id={`country-limit-${i}`} label="Maximum per person (EUR)" required type="number" min="0" max="100000000" step="0.01" placeholder="309.00" value={countryLimits[country] ?? ''} onChange={e => setCountryLimits(v => ({ ...v, [country]: e.target.value }))} /><Field id={`country-expected-${i}`} label="Expected participants" type="number" min="0" max="1000" step="1" placeholder="Not configured" value={expectedParticipants[country] ?? ''} onChange={e => setExpectedParticipants(v => ({ ...v, [country]: e.target.value }))} /></div>)}</div>
          </fieldset>
        </div>
      </div>
      <details open={!project.settings.hasAccessCode} className="group rounded-2xl border bg-white shadow-sm"><summary className="cursor-pointer list-none px-5 py-4 font-semibold md:px-6">Portal access codes <span className="ml-2 text-sm font-normal text-muted-foreground">Participant and partner passwords</span></summary><div className="space-y-5 border-t px-5 py-5 md:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-muted-foreground">Manage the participant password and separate access for each national team.</p><Button type="button" size="sm" variant="outline" onClick={() => setShowPasswords(v => !v)}>{showPasswords ? 'Hide saved passwords' : 'Show saved passwords'}</Button></div><SavedPasswords projectId={project.id} visible={showPasswords} /><div className="max-w-md"><Field id="new-access-code" label={project.settings.hasAccessCode ? 'New participant password (optional)' : 'Participant password'} type={showPasswords ? 'text' : 'password'} required={!project.settings.hasAccessCode} maxLength={128} autoComplete="new-password" value={accessCode} onChange={e => setAccessCode(e.target.value)} disabled={busy} /></div>
      <fieldset disabled={busy} className="space-y-3"><legend className="text-sm font-semibold">Partner passwords by country</legend><div className="grid gap-3 md:grid-cols-2">{countryList.map((country, i) => <div key={country} className="space-y-3 rounded-xl border bg-slate-50/70 p-4"><Field id={`partner-code-${i}`} label={`${country} — ${project.settings.partnerAccessConfigured?.[country] ? 'replacement (optional)' : 'new password'}`} type={showPasswords ? "text" : "password"} autoComplete="off" maxLength={128} disabled={partnerAccessCodes[country] === null} value={partnerAccessCodes[country] ?? ''} onChange={e => setPartnerAccessCodes(v => ({ ...v, [country]: e.target.value }))} /><div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setPartnerAccessCodes(v => ({ ...v, [country]: Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join('') }))}>Generate</Button><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={partnerAccessCodes[country] === null} onChange={e => setPartnerAccessCodes(v => ({ ...v, [country]: e.target.checked ? null : '' }))} />Disable access</label></div></div>)}</div></fieldset></div></details>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm md:px-6">
        <div><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={busy} className="h-4 w-4 accent-primary" />Open reimbursement submissions</label><p className="mt-1 text-xs text-muted-foreground">Changes apply to future submissions only.</p></div>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save project settings'}</Button>
      </div>
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </form>
    </TabsContent>
    <TabsContent value="participants" forceMount className="data-[state=inactive]:hidden">
    <section className="space-y-5">
      <SectionHeading title="Participant reimbursements" description="Track country budgets, review submissions and finalize claims." icon={<Users className="h-5 w-5" />} actions={<Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Refresh</Button>} />
      {query.data && <div className="flex items-stretch gap-3 overflow-x-auto pb-2">{project.settings.countries.map(country => {
        const people = [...new Map([...query.data].reverse().filter(s => s.team === country).map(s => [s.email.trim().toLowerCase(), s])).values()];
        const expected = project.settings.expectedParticipants?.[country]; const approved = people.filter(s => s.approvedAt).length;
        const countryLimitCents = project.settings.countryLimits?.[country];
        const countryBudgetCents = expected === undefined || countryLimitCents === undefined ? undefined : countryLimitCents * expected;
        const combinedExpenseCents = people.reduce((sum, person) => sum + (person.finalCents ?? person.totalCents), 0);
        const remainingBudgetCents = countryBudgetCents === undefined ? undefined : countryBudgetCents - combinedExpenseCents;
        const ready = expected !== undefined && expected > 0 && people.length === expected && approved === expected;
        return <article key={country} className="w-[280px] shrink-0 space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold tracking-tight">{country}</h3><p className="mt-0.5 text-xs text-muted-foreground">{expected === undefined ? 'Expected count not set' : `${expected} participants expected`}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ready ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}><span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />{ready ? 'Ready' : 'In progress'}</span></div>
          <div><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{approved} approved</span><span>{people.length} submitted</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${expected ? Math.min(100, approved / expected * 100) : 0}%` }} /></div></div>
          <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs"><div><dt className="text-muted-foreground">Budget</dt><dd className="mt-1 font-semibold tabular-nums">{countryBudgetCents === undefined ? '—' : euro(countryBudgetCents)}</dd></div><div><dt className="text-muted-foreground">Expenses</dt><dd className="mt-1 font-semibold tabular-nums">{euro(combinedExpenseCents)}</dd></div><div><dt className="text-muted-foreground">Remaining</dt><dd className={`mt-1 font-semibold tabular-nums ${remainingBudgetCents !== undefined && remainingBudgetCents < 0 ? 'text-destructive' : 'text-emerald-700'}`}>{remainingBudgetCents === undefined ? '—' : euro(remainingBudgetCents)}</dd></div></dl>
        </article>;
      })}</div>}
      <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div className="w-full max-w-md"><Field id="submission-search" label="Search submissions" type="search" placeholder="Name, country or email" value={search} onChange={e => setSearch(e.target.value)} /></div><details className="max-w-md text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">About participant PDFs</summary><p className="mt-2">Downloads include participant details, travel costs, exchange rates, bank details, signature and every uploaded ticket.</p></details></div></div>
      {query.isPending ? <p role="status" className="rounded-2xl border bg-white p-6">Loading submissions…</p> : query.isError ? <p role="alert" className="rounded-2xl border bg-white p-6 text-destructive">{query.error.message}</p> : submissions.length === 0 ? <div className="rounded-2xl border bg-white py-12 text-center text-muted-foreground"><Search className="mx-auto mb-3 h-8 w-8 opacity-40" /><p>{search ? 'No submissions match your search.' : 'No submissions yet.'}</p></div> : [...new Set(submissions.map(s => s.team))].sort((a, b) => a.localeCompare(b)).map(country => <section key={country} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b bg-slate-50/70 px-4 py-3"><h3 className="font-semibold">{country}</h3><span className="text-xs text-muted-foreground">{submissions.filter(s => s.team === country).length} claims</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">{['Participant / reference', 'Submitted', 'Expenses', 'Reimbursement', 'Actions'].map(h => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{submissions.filter(s => s.team === country).map(s => <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50/60"><td className="p-4"><div className="flex items-center gap-2"><p className="font-medium">{s.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.approvedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{s.approvedAt ? 'Approved' : 'Pending'}</span></div><p className="mt-1 text-xs text-muted-foreground break-all">{s.email}</p><p className="mt-0.5 text-xs text-muted-foreground break-all">{s.reference ?? s.id}</p></td><td className="p-4 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-4 whitespace-nowrap">{euro(s.totalCents)}</td><td className="p-4 whitespace-nowrap font-semibold">{euro(s.finalCents ?? s.totalCents)}</td><td className="p-4"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(s.id)}>Review</Button><Button size="sm" onClick={() => download(s.id)} disabled={downloading === s.id}><Download className="mr-2 h-4 w-4" />{downloading === s.id ? 'Preparing…' : 'PDF'}</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(s)} disabled={deleting === s.id}>{deleting === s.id ? 'Deleting…' : 'Delete'}</Button></div></td></tr>)}</tbody></table></div></section>)}
    </section>
    </TabsContent>
    <TabsContent value="partners" forceMount className="space-y-5 data-[state=inactive]:hidden">
    <SectionHeading title="Partner documents" description="Declarations and signed agreements from partner organisations." icon={<Handshake className="h-5 w-5" />} />
    <section className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Reimbursement declarations</h3><p className="mt-1 text-sm text-muted-foreground">Submitted after participant reimbursements are finalized.</p></div><Button variant="outline" size="sm" onClick={() => organisationQuery.refetch()} disabled={organisationQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${organisationQuery.isFetching ? 'animate-spin' : ''}`} />Refresh</Button></div>
      {organisationQuery.isPending ? <p role="status">Loading organisation declarations…</p> : organisationQuery.isError ? <p role="alert" className="text-destructive">{organisationQuery.error.message}</p> : organisationQuery.data.length === 0 ? <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-muted-foreground">No organisation declarations submitted yet.</p> : <div className="grid gap-3 md:grid-cols-2">{organisationQuery.data.map(item => <article key={item.id} className="space-y-4 rounded-xl border p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.country}</p><h4 className="mt-1 font-semibold">{item.organisationName}</h4><p className="mt-1 text-sm text-muted-foreground">{item.legalRepresentativeName}</p></div><div className="flex flex-wrap items-end justify-between gap-3 border-t pt-3"><div><p className="text-xs text-muted-foreground">Bank transfer</p><p className="text-xl font-semibold tabular-nums">{euro(item.totalCents)}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => downloadOrganisation(item)} disabled={downloadingOrganisation===item.id}><Download className="mr-2 h-4 w-4" />{downloadingOrganisation===item.id?'Preparing…':'PDF'}</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteOrganisation(item)} disabled={deletingDocument === item.id}>{deletingDocument === item.id ? 'Deleting…' : 'Delete'}</Button></div></div></article>)}</div>}
    </section>
    <section className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Partnership agreements</h3><p className="mt-1 text-sm text-muted-foreground">Signed agreements submitted by partner organisations.</p></div><Button variant="outline" size="sm" onClick={() => partnershipQuery.refetch()} disabled={partnershipQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${partnershipQuery.isFetching ? 'animate-spin' : ''}`} />Refresh</Button></div>{partnershipQuery.isPending ? <p role="status">Loading partnership agreements…</p> : partnershipQuery.isError ? <p role="alert" className="text-destructive">{partnershipQuery.error.message}</p> : partnershipQuery.data.length === 0 ? <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-muted-foreground">No partnership agreements submitted yet.</p> : <div className="grid gap-3 md:grid-cols-2">{partnershipQuery.data.map(item => <article key={item.id} className="space-y-4 rounded-xl border p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.partnerCountry}</p><h4 className="mt-1 font-semibold">{item.partnerName}</h4><p className="mt-1 text-sm text-muted-foreground">{item.legalRepresentativeName}</p><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(item.createdAt).toLocaleDateString()}</p></div><div className="flex gap-2 border-t pt-3"><Button size="sm" onClick={() => downloadPartnership(item)} disabled={downloadingOrganisation === item.id}><Download className="mr-2 h-4 w-4" />{downloadingOrganisation === item.id ? 'Preparing…' : 'PDF'}</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deletePartnership(item)} disabled={deletingDocument === item.id}>{deletingDocument === item.id ? 'Deleting…' : 'Delete'}</Button></div></article>)}</div>}</section>
    {reviewId && <PdfDownloadReview key={reviewId} id={reviewId} onClose={() => setReviewId(null)} />}
    </TabsContent>
    <TabsContent value="drive" forceMount className="data-[state=inactive]:hidden"><ProjectDriveAdmin projectId={project.id} /></TabsContent>
    <TabsContent value="directory" forceMount className="data-[state=inactive]:hidden"><ProjectParticipantsAdmin projectId={project.id} projectTitle={project.title} countries={countryList} /></TabsContent>
    </Tabs>
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Participant reimbursement</DialogTitle><DialogDescription>Review the claim, adjust reimbursement details and finalize it.</DialogDescription></DialogHeader>{selected && <ClaimDetails id={selected} onDownload={() => download(selected)} downloading={downloading === selected} />}</DialogContent></Dialog>
  </div>;
}
function ClaimDetails({ id, onDownload, downloading }: { id: string; onDownload: () => void; downloading: boolean }) {
  const query = useQuery({ queryKey: ['admin-claim', id], queryFn: () => api<SavedClaim>(`/admin/submissions/${id}`), retry: false });
  if (query.isPending) return <p role="status">Loading participant details…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;
  const c = query.data;
  const journey: [string, string][] = [['Project', c.projectName], ['Project code', c.projectCode], ['Activity dates', `${c.activityStartDate ?? 'Not recorded'} – ${c.activityEndDate ?? 'Not recorded'}`], ['Destination', c.destinationCity ?? 'Not recorded'], ['Residence', `${c.participant.city}, ${c.participant.team}`], ['Travel dates', `${c.participant.arrivalDate} – ${c.participant.departureDate}`], ['Role', c.participant.role], ['Green travel', c.participant.greenTravel ? 'Yes' : 'No'], ['Notes', c.participant.notes]];
  const personal: [string, string][] = [['Email', c.participant.email], ['Phone', c.participant.phone], ['Citizenship', c.participant.citizenship], ['Date of birth', c.participant.dateOfBirth], ['Address', c.participant.address], ['Account holder', c.participant.accountHolder], ['Bank', c.participant.bankName], ['IBAN / account', c.participant.bankAccount], ['BIC / SWIFT', c.participant.bic], ['Signature place', c.participant.signaturePlace]];
  const detailList = (items: [string, string][]) => <dl className="grid gap-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || 'Not provided'}</dd></div>)}</dl>;
  return <div className="space-y-5"><div className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.participant.team} · {c.participant.role}</p><h3 className="mt-1 text-xl font-semibold">{c.participant.name}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{claimReference(c)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${c.approvedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{c.approvedAt ? 'Approved' : 'Pending approval'}</span></div></div><section className="rounded-xl border p-4"><h3 className="mb-4 font-semibold">Journey &amp; project</h3>{detailList(journey)}</section><details className="rounded-xl border"><summary className="cursor-pointer px-4 py-3 font-semibold">Personal &amp; bank details</summary><div className="border-t p-4">{detailList(personal)}</div></details><section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Tickets &amp; receipts <span className="text-sm font-normal text-muted-foreground">({c.tickets.length})</span></h3>{c.tickets.map(t => <article key={t.serial} className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{isReceipt(t) ? "Receipt" : "Ticket"} {t.serial} · {t.mode}</p><strong>{euro(t.euroCents)}</strong></div><p className="text-muted-foreground">{t.ticketType ?? 'Format not recorded'} · {flightRoute(t)}</p><p className="text-xs text-muted-foreground">Purchased {t.purchaseDate}{!isReceipt(t) && ` · Travel ${t.travelDate}`} · {t.amount.toFixed(2)} {t.currency}</p><p className="text-xs text-muted-foreground">1 {t.currency} = {t.rate} EUR · {t.rateDate} · {t.source}</p><p className="text-xs break-all text-muted-foreground">{t.filename}</p></article>)}</section><ExtraReimbursement key={`${c.id}-${c.extraApprovedAt}`} claim={c} /><GreenTravelEditor key={`${c.id}-${c.participant.greenTravel}`} claim={c} /><FinalApproval claim={c} /><div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border p-4"><div><h3 className="text-sm font-semibold">Participant signature</h3><img src={c.signature} alt={`Signature of ${c.participant.name}`} className="mt-2 h-20 w-64 max-w-full rounded-lg border bg-white object-contain" /></div><Button onClick={onDownload} disabled={downloading}><Download className="mr-2 h-4 w-4" />{downloading ? 'Preparing…' : 'Download complete PDF'}</Button></div></div>;
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

function GreenTravelEditor({ claim }: { claim: SavedClaim }) {
  const client = useQueryClient();
  const [greenTravel, setGreenTravel] = useState(claim.participant.greenTravel);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changed = greenTravel !== claim.participant.greenTravel;
  const latest = claim.greenTravelCorrections?.at(-1);
  const lockedReason = !greenTravel && claim.tickets.some(ticket => ticket.mode === 'Flight')
    ? 'Green travel cannot be enabled because this claim includes a flight.'
    : greenTravel && claim.tickets.some(isReceipt)
      ? 'Green travel cannot be disabled while food or accommodation receipts are included.'
      : greenTravel && allGreenTransport(claim.tickets)
        ? 'Green travel cannot be disabled when all transport is by car, bus, or train.'
        : '';
  const conflict = greenTravel && claim.tickets.some(ticket => ticket.mode === 'Flight') ? 'This claim contains flights, so green travel cannot be selected.' : !greenTravel && claim.tickets.some(isReceipt) ? 'Food and accommodation receipts require green travel. Review those expenses first.' : !greenTravel && allGreenTransport(claim.tickets) ? 'All transport is by car, bus, or train, so green travel must be enabled.' : '';
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = greenTravelCorrectionSchema.safeParse({ greenTravel, reason });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const saved = await api<SavedClaim>(`/admin/submissions/${claim.id}/green-travel`, { method: 'PUT', body: JSON.stringify(parsed.data) });
      client.setQueryData(['admin-claim', claim.id], saved);
      await client.invalidateQueries({ queryKey: ['admin-submissions', claim.projectId] });
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
    <h3 className="font-semibold">Correct green travel</h3>
    <p className="text-sm text-muted-foreground">Correct an accidental selection here, then download a fresh PDF. The correction and your reason remain recorded in the claim history.</p>
    {latest && <p role="status" className="text-xs text-muted-foreground">Saved correction: {latest.value ? 'Yes' : 'No'} · {new Date(latest.correctedAt).toLocaleString()} · {latest.reason}</p>}
    <form onSubmit={save} className="space-y-3">
      <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={greenTravel} onChange={event => setGreenTravel(event.target.checked)} disabled={busy || !!lockedReason} aria-describedby={lockedReason ? "green-travel-lock" : undefined} />Green travel — entire journey without flights</label>
      {lockedReason && <p id="green-travel-lock" className="text-sm text-muted-foreground">{lockedReason}</p>}
      {changed && <AddressField id="green-travel-reason" label="Reason for correction" required maxLength={500} rows={2} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />}
      {greenTravel && (claim.greenTravelCorrections?.[0]?.previous ?? claim.participant.greenTravel) === false && <p className="text-xs text-muted-foreground">The participant’s submitted signature will also appear on the green travel declaration in the updated PDF.</p>}
      {conflict && <p className="text-sm text-destructive">{conflict}</p>}
      <Button type="submit" disabled={busy || !changed || !!conflict}>{busy ? 'Saving correction…' : 'Save green travel correction'}</Button>
      {changed && <p className="text-xs text-muted-foreground">Save before downloading. Until saved, the PDF uses the previous selection.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </section>;
}

function FinalApproval({ claim }: { claim: SavedClaim }) {
  const client = useQueryClient(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function finalize() {
    setBusy(true); setError('');
    try { await api(`/admin/submissions/${claim.id}/finalize`, { method: 'PUT', body: '{}' }); await client.invalidateQueries({ queryKey: ['admin-claim', claim.id] }); await client.invalidateQueries({ queryKey: ['admin-submissions', claim.projectId] }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border p-4 space-y-3"><h3 className="font-semibold">Final participant approval</h3>{claim.approvedAt ? <p className="text-green-700">Approved and finalized on {new Date(claim.approvedAt).toLocaleString()}. Participant access is permanently locked. Any correction must be made by an administrator.</p> : <><p className="text-sm">Review all documents and reimbursement amounts first. Final approval verifies this claim for team reimbursement and permanently locks participant access.</p><Button disabled={busy} onClick={finalize}>{busy ? 'Finalizing…' : 'Approve and finalize application'}</Button></>}{error && <p role="alert" className="text-destructive">{error}</p>}</section>;
}

function SavedPasswords({ projectId, visible }: { projectId: string; visible: boolean }) {
  const query = useQuery({ queryKey: ['admin-access-codes', projectId], queryFn: () => api<{ participant: string | null; partners: Record<string, string> }>(`/admin/projects/${projectId}/access-codes`), enabled: visible, staleTime: 0, gcTime: 0 });
  if (!visible) return <p className="text-sm text-muted-foreground">Saved passwords: ••••••••</p>;
  return <div className="rounded-lg border p-3 space-y-2">{query.isPending ? <p>Loading saved passwords…</p> : query.isError ? <p role="alert" className="text-destructive">{query.error.message}</p> : <><Field id="saved-participant-code" label="Saved participant password" readOnly value={query.data.participant ?? ''} placeholder="Older password: enter it once again to enable reveal" />{Object.entries(query.data.partners).map(([country, code]) => <Field key={country} id={`saved-code-${country}`} label={`${country} — saved password`} readOnly value={code} />)}<p className="text-xs text-muted-foreground">Older passwords stored only as hashes cannot be revealed. Set them once again below. New or replacement passwords have no minimum length.</p></>}</div>;
}
