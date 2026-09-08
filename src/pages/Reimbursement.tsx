import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FolderOpen, ExternalLink, Plus, Trash2, CheckCircle2, FileText, LockKeyhole, Send, RefreshCw } from 'lucide-react';
import { acceptsReimbursements, projects } from '@/data/projects';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, SelectField, AddressField } from '@/components/reimbursement/Field';
import SignaturePad from '@/components/reimbursement/SignaturePad';
import AccessGate from '@/components/reimbursement/AccessGate';
import { api, ApiError } from '@/lib/reimbursement-api';
import { declarationIntro, declarationPoints, greenTravelConfirmation, greenTravelDeclaration, currencies, travelModes, receiptTypes, isReceipt, claimSchema, purchaseDateSchema, euroCents, euro, today, MAX_TICKETS, MAX_FILE_SIZE, MAX_TOTAL_SIZE, type Participant, type ProjectSettings, type Rate, type TicketInput } from '../../shared/reimbursement';
import NotFound from './NotFound';

type DraftPass = { journey: 'outbound' | 'return'; from: string; to: string; file: File | null };
type DraftTicket = Omit<TicketInput, 'amount' | 'boardingPasses'> & { id: string; amount: string; file: File | null; boardingPasses: DraftPass[] };
const newPass = (journey: DraftPass['journey'], from = '', to = ''): DraftPass => ({ journey, from, to, file: null });
const newTicket = (): DraftTicket => ({ id: crypto.randomUUID(), purchaseDate: '', travelDate: '', from: '', to: '', mode: 'Train', ticketType: 'Electronic ticket', currency: 'EUR', amount: '', file: null, journeyType: 'one-way', connections: false, boardingPasses: [] });
const blankParticipant: Participant = { firstName: '', lastName: '', name: '', citizenship: '', team: '', city: '', notes: '', greenTravel: false, arrivalDate: '', departureDate: '', role: 'Participant', bankName: '', accountHolder: '', signaturePlace: '', dateOfBirth: '', email: '', phone: '', bankAccount: '', bic: '', bankAddress: '', address: '' };
const participantForProject = (projectId: string): Participant => projectId === 'green-stage-sustainable-future'
  ? { ...blankParticipant, city: 'Silijan', team: 'Norway' }
  : { ...blankParticipant };

export default function Reimbursement() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = projects.find(p => p.id === projectId && acceptsReimbursements(p));
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['participant-session', projectId], queryFn: () => api<ProjectSettings & { reimbursementDriveUrl?: string }>(`/projects/${projectId}/session`), enabled: !!project, retry: false, refetchOnWindowFocus: false });
  const showMenu = !!session.data?.reimbursementDriveUrl && searchParams.get('view') !== 'form';
  if (!project) return <NotFound />;
  return <div className="page-shell py-10 md:py-16 space-y-8">
    <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />Back to {project.title}</Link>
    <header className="space-y-3"><p className="text-sm uppercase tracking-[0.18em] text-primary">{project.title}</p><h1 className="text-3xl md:text-4xl font-semibold">{showMenu ? 'Participant Dashboard' : 'Travel reimbursement'}</h1><p className="text-muted-foreground max-w-2xl">{showMenu ? 'Access your reimbursement Drive or complete your travel reimbursement form.' : 'All your travel details, tickets, and signature in one place.'}</p></header>
    {session.isPending ? <p role="status">Checking participant access…</p> : session.isError ? (session.error instanceof ApiError && session.error.status === 401 ? <AccessGate destination="dashboard" projectId={project.id} onUnlocked={() => client.invalidateQueries({ queryKey: ['participant-session', projectId] })} /> : <div className="rounded-xl border bg-card p-6 space-y-4"><p role="alert">{session.error.message}</p><Button variant="outline" onClick={() => session.refetch()}>Try again</Button></div>) : showMenu ? <section aria-label="Reimbursement options" className="grid gap-5 md:grid-cols-2 max-w-4xl">
      <a href={session.data.reimbursementDriveUrl} target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-4 transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <FolderOpen className="h-8 w-8 text-emerald-700" /><h2 className="text-xl font-semibold">Reimbursement Drive</h2><p className="text-sm text-muted-foreground">Open the project’s Countries folder in Google Drive for travel tickets. Sign in with the Google account your organizer has granted access to.</p><span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">Open Drive<ExternalLink className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span></span>
      </a>
      <Link to="?view=form" className="group rounded-2xl border border-blue-200 bg-blue-50/60 p-6 space-y-4 transition hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <FileText className="h-8 w-8 text-blue-700" /><h2 className="text-xl font-semibold">Reimbursement form</h2><p className="text-sm text-muted-foreground">Submit your travel costs, tickets, bank details, and signature for reimbursement.</p><span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800">Continue to form<ArrowRight className="h-4 w-4" /></span>
      </Link>
    </section> : <>
      {session.data.reimbursementDriveUrl && <Button variant="outline" onClick={() => setSearchParams({})}><ArrowLeft className="mr-2 h-4 w-4" />Back to reimbursement options</Button>}
      <ClaimForm key={project.id} projectId={project.id} settings={session.data} />
    </>}
  </div>;
}

function ClaimForm({ projectId, settings }: { projectId: string; settings: ProjectSettings }) {
  const [mode, setMode] = useState<'choose' | 'resume' | 'form'>('choose');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [revision, setRevision] = useState(0);
  const [previousNumber, setPreviousNumber] = useState('');
  const [previousEmail, setPreviousEmail] = useState('');
  const legacyReference = !!previousNumber.trim() && !/^IJBK-[0-9a-f]{48}$/i.test(previousNumber.trim());
  const [saveMessage, setSaveMessage] = useState('');
  const client = useQueryClient();
  const fixedResidence = projectId === 'green-stage-sustainable-future';
  const [participant, setParticipant] = useState<Participant>(() => participantForProject(projectId));
  const [tickets, setTickets] = useState<DraftTicket[]>([newTicket()]);
  const [signature, setSignature] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needUnlock, setNeedUnlock] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; reference?: string; number?: string; totalCents?: number; finalCents?: number } | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [greenDialogOpen, setGreenDialogOpen] = useState(false);
  const [greenTravelConflictOpen, setGreenTravelConflictOpen] = useState(false);
  const [greenDeclarationAccepted, setGreenDeclarationAccepted] = useState(false);
  const rates = useQueries({ queries: tickets.map(ticket => ({
    queryKey: ['rate', projectId, ticket.currency, ticket.purchaseDate],
    queryFn: () => api<Rate>(`/projects/${projectId}/rate?currency=${ticket.currency}&date=${ticket.purchaseDate}`),
    enabled: purchaseDateSchema.safeParse(ticket.purchaseDate).success && !receipt && !needUnlock,
    retry: 1, staleTime: 3600000, refetchOnWindowFocus: false,
  })) });
  const completeRates = tickets.every((ticket, i) => rates[i].data && Number(ticket.amount) > 0);
  const accessExpired = needUnlock || rates.some(r => r.error instanceof ApiError && r.error.status === 401);
  const total = tickets.reduce((sum, ticket, i) => sum + (rates[i].data && Number(ticket.amount) > 0 ? euroCents(Number(ticket.amount), rates[i].data.rate) : 0), 0);
  const updateParticipant = (field: keyof Participant, value: string) => setParticipant(p => ({ ...p, [field]: value }));
  const updateTicket = (id: string, update: Partial<DraftTicket>) => setTickets(rows => rows.map(row => row.id === id ? { ...row, ...update } : row));
  function draftForm() {
    const form = new FormData();
    form.append('claim', JSON.stringify({ requestId, participant, tickets: tickets.map(t => ({ ...t, file: undefined, boardingPasses: t.boardingPasses.map(p => ({ ...p, file: undefined })) })), signature, declaration }));
    if (applicationNumber) { form.append('number', applicationNumber); form.append('revision', String(revision)); }
    tickets.forEach((t, i) => { if (t.file) form.append(`ticket-${i}`, t.file); t.boardingPasses.forEach((p, j) => { if (p.file) form.append(`boarding-${i}-${j}`, p.file); }); });
    return form;
  }
  async function persistDraft() {
    const result = await api<{ number: string; revision: number }>(`/projects/${projectId}/applications/save`, { method: 'POST', body: draftForm() });
    setApplicationNumber(result.number); setRevision(result.revision);
    setSaveMessage('Form saved, but not submitted. Keep your private submission number to continue later.');
    return result;
  }
  async function saveDraft() {
    setBusy(true); setError(''); setSaveMessage('');
    try { await persistDraft(); } catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 401) setNeedUnlock(true); } finally { setBusy(false); }
  }
  async function resume(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ number: string; data: { participant: Participant; tickets: DraftTicket[]; signature: string; declaration: boolean }; files: Record<string, { name: string; type: string }>; revision: number; submitted: boolean }>(`/projects/${projectId}/applications/resume`, { method: 'POST', body: JSON.stringify({ number: previousNumber.trim(), email: previousEmail.trim() }) });
      const files: Record<string, File> = {};
      for (const [key, file] of Object.entries(result.files)) {
        const response = await fetch(`/api/projects/${projectId}/applications/document`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: result.number, key, revision: result.revision }) });
        if (!response.ok) throw new Error((await response.json()).error || 'Could not restore a saved document. Please retry.');
        files[key] = new File([await response.blob()], file.name, { type: file.type });
      }
      setParticipant({ ...participantForProject(projectId), ...result.data.participant });
      setTickets((result.data.tickets.length ? result.data.tickets : [newTicket()]).map((t, i) => ({ ...newTicket(), ...t, id: crypto.randomUUID(), amount: String(t.amount ?? ''), file: files[`ticket-${i}`] ?? null, boardingPasses: (t.boardingPasses ?? []).map((p, j) => ({ ...p, file: files[`boarding-${i}-${j}`] ?? null })) })));
      setSignature(result.data.signature || ''); setDeclaration(result.data.declaration || false); setApplicationNumber(result.number); setRevision(result.revision); setRequestId(crypto.randomUUID()); setFormVersion(v => v + 1); setMode('form');
      setSaveMessage(result.submitted ? 'This application is pending approval. Saving changes returns it to draft; click Submit Form again when ready.' : 'Saved application loaded. Complete the missing items and submit when ready.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = claimSchema.safeParse({ requestId: crypto.randomUUID(), participant, tickets: tickets.map(t => ({ ...t, amount: Number(t.amount) })), signature, declaration });
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join(' → ')}: ${i.message}`).join('; ')); return; }
    if (!signature) { setError('Please draw your signature.'); return; }
    const missing = tickets.findIndex(t => !t.file);
    if (missing >= 0) { setError(`Please upload the file for ticket ${missing + 1}.`); return; }
    if (tickets.some(t => t.mode === 'Flight' && (!t.boardingPasses.some(p => p.journey === 'outbound') || (t.journeyType === 'round-trip' && !t.boardingPasses.some(p => p.journey === 'return'))))) { setError('Boarding pass missing: add the outbound and return flight segments.'); return; }
    if (tickets.some(t => t.boardingPasses.some(p => !p.file || !p.file.size))) { setError('Upload every selected boarding pass before submitting.'); return; }
    if (tickets.reduce((sum, t) => sum + (t.file?.size ?? 0) + t.boardingPasses.reduce((n, p) => n + (p.file?.size ?? 0), 0), 0) > MAX_TOTAL_SIZE) { setError('Total uploads must not exceed 40 MB.'); return; }
    setBusy(true);
    const form = new FormData(); form.append('claim', JSON.stringify(parsed.data));
    tickets.forEach((t, i) => { form.append(`ticket-${i}`, t.file!); t.boardingPasses.forEach((p, j) => { if (p.file) form.append(`boarding-${i}-${j}`, p.file); }); });
    try {
      const savedDraft = await persistDraft();
      form.append('number', savedDraft.number); form.append('revision', String(savedDraft.revision));
      const result = await api<{ id: string; reference?: string; number?: string; totalCents?: number; finalCents?: number }>(`/projects/${projectId}/submissions`, { method: 'POST', body: form });
      setReceipt(result); setParticipant(participantForProject(projectId)); setTickets([newTicket()]); setSignature(''); setDeclaration(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 401) setNeedUnlock(true); }
    finally { setBusy(false); }
  }
  if (mode !== 'form') return <section className="max-w-2xl rounded-2xl border bg-card p-8 space-y-5">
    <h2 className="text-2xl font-semibold">Reimbursement application</h2>
    <div className="flex flex-wrap gap-3"><Button onClick={() => { setMode('form'); setError(''); }}>Start New Reimbursement Form</Button><Button variant="outline" onClick={() => { setMode('resume'); setError(''); }}>Continue Previous Application</Button></div>
    {mode === 'resume' && <form onSubmit={resume} className="space-y-4"><Field id="previous-number" label="Previous submission number or reference" required value={previousNumber} onChange={e => setPreviousNumber(e.target.value)} autoComplete="off" />{legacyReference && <><Field id="previous-email" label="Email used on the application" type="email" required value={previousEmail} onChange={e => setPreviousEmail(e.target.value)} autoComplete="email" /><p className="text-sm text-muted-foreground">Older name-based references require the participant email. Once loaded, keep the private submission number shown on your form.</p></>}<Button type="submit" disabled={busy}>{busy ? 'Loading…' : 'Load application'}</Button></form>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </section>;
  if (receipt) return <section className="max-w-2xl mx-auto rounded-2xl border bg-card p-8 md:p-12 text-center space-y-5">
    <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" /><h2 className="text-3xl font-semibold">Reimbursement submitted</h2>
    <p className="text-muted-foreground">Your application has been formally submitted and is pending administrator approval.</p>
    {receipt.totalCents !== undefined && <p className="text-sm">Submitted expenses: {euro(receipt.totalCents)}</p>}{receipt.finalCents !== undefined && <p className="text-xl font-semibold text-primary">Reimbursement amount: {euro(receipt.finalCents)}</p>}
    <p className="text-sm break-all">Submission reference: <strong>{receipt.number || receipt.reference || receipt.id}</strong></p><p className="text-xs text-muted-foreground">Keep this reference if you need to contact your organizer.</p>
    <div className="flex flex-wrap justify-center gap-3"><Button asChild><Link to={`/projects/${projectId}`}>Back to project</Link></Button><Button variant="outline" onClick={() => { setReceipt(null); setApplicationNumber(''); setRevision(0); setSaveMessage(''); setMode('choose'); setRequestId(crypto.randomUUID()); setFormVersion(v => v + 1); }}>Start another participant’s form</Button></div>
  </section>;
  const renderTicket = (ticket: DraftTicket, i: number) => <article key={ticket.id} className={`overflow-hidden rounded-2xl border-2 bg-background shadow-sm ${i % 2 === 0 ? 'border-sky-200/90 dark:border-sky-900' : 'border-violet-200/90 dark:border-violet-900'}`}>
            <div className={`flex items-center justify-between border-b px-4 py-3 md:px-5 ${i % 2 === 0 ? 'border-sky-200 bg-sky-100/70 dark:border-sky-900 dark:bg-sky-950/30' : 'border-violet-200 bg-violet-100/70 dark:border-violet-900 dark:bg-violet-950/30'}`}><h3 className="font-semibold flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-primary shadow-sm">{i + 1}</span>{isReceipt(ticket) ? `${ticket.mode} receipt` : "Ticket"} {i + 1}</h3><Button type="button" size="sm" variant="ghost" disabled={!isReceipt(ticket) && tickets.filter(t => !isReceipt(t)).length === 1} onClick={() => setTickets(rows => rows.filter(row => row.id !== ticket.id))} aria-label={`Remove ticket ${i + 1}`}><Trash2 className="w-4 h-4 mr-1" />Remove</Button></div>
            <div className="space-y-5 p-4 md:p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field id={`${ticket.id}-purchase`} label={isReceipt(ticket) ? "Receipt purchase date" : "Ticket purchase date"} type="date" required min="1999-01-04" max={today()} value={ticket.purchaseDate} onChange={e => updateTicket(ticket.id, { purchaseDate: e.target.value })} />
              <Field id={`${ticket.id}-travel`} label="Travel date" type="date" disabled={isReceipt(ticket)} required={!isReceipt(ticket)} min={ticket.purchaseDate || undefined} value={isReceipt(ticket) ? '' : ticket.travelDate} onChange={e => updateTicket(ticket.id, { travelDate: e.target.value })} />
              <Field id={`${ticket.id}-from`} label={isReceipt(ticket) ? "Place" : "From"} required maxLength={120} placeholder={isReceipt(ticket) ? "Place where the expense occurred" : "City / airport / station"} value={ticket.from} onChange={e => updateTicket(ticket.id, { from: e.target.value })} />
              {isReceipt(ticket) ? <SelectField id={`${ticket.id}-to`} label="Food / accommodation" required value={ticket.mode} onChange={e => updateTicket(ticket.id, { mode: e.target.value as DraftTicket['mode'], to: e.target.value, travelDate: '' })}>{receiptTypes.map(m => <option key={m}>{m}</option>)}</SelectField> : <>
              <Field id={`${ticket.id}-to`} label="To" required maxLength={120} placeholder="City / airport / station" value={ticket.to} onChange={e => updateTicket(ticket.id, { to: e.target.value })} />
              <SelectField id={`${ticket.id}-mode`} label="Mode of travel" required value={ticket.mode} onChange={e => {
                if (e.target.value === 'Flight' && participant.greenTravel) { setGreenTravelConflictOpen(true); return; }
                updateTicket(ticket.id, { mode: e.target.value as DraftTicket['mode'], boardingPasses: e.target.value === 'Flight' ? [newPass('outbound', ticket.from, ticket.to)] : [], journeyType: 'one-way', connections: false });
              }}>{travelModes.map(m => <option key={m}>{m}</option>)}</SelectField></>}
              <SelectField id={`${ticket.id}-type`} label="Ticket format" value={ticket.ticketType} onChange={e => updateTicket(ticket.id, { ticketType: e.target.value as DraftTicket['ticketType'] })}><option>Paper ticket</option><option>Electronic ticket</option></SelectField>
              <SelectField id={`${ticket.id}-currency`} label="Purchase currency" required value={ticket.currency} onChange={e => updateTicket(ticket.id, { currency: e.target.value as DraftTicket['currency'] })}>{currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</SelectField>
              <Field id={`${ticket.id}-amount`} label={`Amount paid (${ticket.currency})`} type="number" inputMode="decimal" required min="0.01" max="100000000" step="0.01" value={ticket.amount} onChange={e => updateTicket(ticket.id, { amount: e.target.value })} />
              <div className="space-y-2"><span className="block text-sm font-medium">Amount in euros</span><output className="flex h-10 items-center rounded-md bg-primary/5 px-3 font-semibold text-primary" aria-live="polite">{rates[i].data && Number(ticket.amount) > 0 ? euro(euroCents(Number(ticket.amount), rates[i].data.rate)) : '—'}</output></div>
            </div>
            <div aria-live="polite" className="text-xs text-muted-foreground">
              {rates[i].isError ? <p className="text-destructive">{rates[i].error.message} <button type="button" className="underline font-medium" onClick={() => rates[i].refetch()}>Retry rate</button></p> : rates[i].isFetching ? 'Finding the exchange rate…' : rates[i].data ? `1 ${ticket.currency} = ${rates[i].data.rate} EUR · Rate date: ${rates[i].data.rateDate} · ${rates[i].data.source}` : 'Select a purchase date to calculate the euro amount.'}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2 dark:border-amber-900 dark:bg-amber-950/15">
              <Field id={`${ticket.id}-file`} label={isReceipt(ticket) ? `Upload ${ticket.mode.toLowerCase()} receipt (PDF or image)` : `Upload invoice ${i + 1} (If another flight has a separate invoice, add it as a separate ticket.)`} type="file" accept="application/pdf,image/*,.pdf" required={!ticket.file} onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file && (file.size > MAX_FILE_SIZE)) { e.target.value = ''; updateTicket(ticket.id, { file: null }); setError(`Ticket ${i + 1}: upload a PDF or image no larger than 10 MB.`); return; }
                updateTicket(ticket.id, { file }); setError('');
              }} />
              {!ticket.file && <p role="alert" className="text-sm font-medium text-red-700">{isReceipt(ticket) ? `${ticket.mode} receipt missing` : 'Invoice missing'}</p>}
              {ticket.file && <p className="text-xs text-primary break-all"><FileText className="w-3 h-3 inline mr-1" />{ticket.file.name} · {(ticket.file.size / 1024 / 1024).toFixed(2)} MB</p>}
            </div>
            {ticket.mode === 'Flight' && <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-4 dark:border-indigo-900 dark:bg-indigo-950/15">
              <h4 className="font-semibold text-indigo-950 dark:text-indigo-100">Boarding passes</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField id={`${ticket.id}-journey`} label="Booking" value={ticket.journeyType ?? 'one-way'} onChange={e => {
                  const journeyType = e.target.value as DraftTicket['journeyType'];
                  updateTicket(ticket.id, { journeyType, boardingPasses: journeyType === 'round-trip' ? [...ticket.boardingPasses.filter(p => p.journey === 'outbound'), newPass('return', ticket.to, ticket.from)] : ticket.boardingPasses.filter(p => p.journey === 'outbound') });
                }}><option value="one-way">One-way</option><option value="round-trip">Round trip / return journey</option></SelectField>
                <SelectField id={`${ticket.id}-connections`} label="Did you change planes to reach your destination?" value={ticket.connections ? 'yes' : 'no'} onChange={e => {
                  const connections = e.target.value === 'yes';
                  updateTicket(ticket.id, { connections, boardingPasses: connections ? ticket.boardingPasses : ['outbound', ...(ticket.journeyType === 'round-trip' ? ['return'] : [])].map(j => ticket.boardingPasses.find(p => p.journey === j) ?? newPass(j as DraftPass['journey'])) });
                }}><option value="no">No - direct flights</option><option value="yes">Yes - choose the number of flights below</option></SelectField>
              </div>
              <p className="text-sm text-muted-foreground">If you changed planes, count each flight separately. For example, Berlin to Munich to Rome is 2 flight segments. Upload one boarding pass for each flight.</p>
              <div className={ticket.journeyType === 'round-trip' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
              {(['outbound', ...(ticket.journeyType === 'round-trip' ? ['return'] : [])] as DraftPass['journey'][]).map(journey => <section key={journey} className={`min-w-0 rounded-xl border p-3 space-y-3 ${journey === 'outbound' ? 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20' : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
                <h5 className={`font-semibold ${journey === 'outbound' ? 'text-sky-900 dark:text-sky-100' : 'text-emerald-900 dark:text-emerald-100'}`}>{journey === 'outbound' ? 'Outbound journey' : 'Return journey'}</h5>
                {ticket.connections && <SelectField id={`${ticket.id}-${journey}-count`} label="Number of flight segments" value={ticket.boardingPasses.filter(p => p.journey === journey).length} onChange={e => {
                  const old = ticket.boardingPasses.filter(p => p.journey === journey);
                  const changed = Array.from({ length: Number(e.target.value) }, (_, n) => old[n] ?? newPass(journey));
                  const other = ticket.boardingPasses.filter(p => p.journey !== journey);
                  updateTicket(ticket.id, { boardingPasses: journey === 'outbound' ? [...changed, ...other] : [...other, ...changed] });
                }}>{Array.from({ length: 12 }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}</SelectField>}
                <div
                  className="grid grid-cols-1 gap-3 md:[grid-template-columns:repeat(var(--segment-count),minmax(0,1fr))]"
                  style={{ '--segment-count': ticket.boardingPasses.filter(pass => pass.journey === journey).length } as CSSProperties}
                >
                  {ticket.boardingPasses.map((pass, j) => pass.journey !== journey ? null : <div key={`${journey}-${j}`} className="min-w-0 rounded-lg border bg-background p-3 shadow-sm space-y-3">
                    <p className="text-sm font-semibold">Flight segment {ticket.boardingPasses.slice(0, j + 1).filter(p => p.journey === journey).length}</p>
                    <div className="space-y-3">{(['from', 'to'] as const).map(field => <Field key={field} id={`${ticket.id}-pass-${j}-${field}`} label={`${field === 'from' ? 'From' : 'To'} airport`} maxLength={120} value={pass[field]} onChange={e => updateTicket(ticket.id, { boardingPasses: ticket.boardingPasses.map((p, n) => n === j ? { ...p, [field]: e.target.value } : p) })} />)}</div>
                    <Field id={`${ticket.id}-pass-${j}`} label="Upload boarding pass" type="file" required={!pass.file} accept="application/pdf,image/*,.pdf" onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && file.size > MAX_FILE_SIZE) { e.target.value = ''; updateTicket(ticket.id, { boardingPasses: ticket.boardingPasses.map((p, n) => n === j ? { ...p, file: null } : p) }); setError('Boarding passes must be no larger than 10 MB.'); return; }
                      updateTicket(ticket.id, { boardingPasses: ticket.boardingPasses.map((p, n) => n === j ? { ...p, file } : p) });
                    }} />
                    {pass.file ? <p className="text-xs break-all">{pass.file.name}</p> : <p role="alert" className="text-sm text-red-700">Boarding pass missing</p>}
                  </div>)}
                </div>
              </section>)}
              </div>
            </div>}
            </div>
          </article>;
  return <div className="space-y-6">
    {accessExpired && <AccessGate projectId={projectId} onUnlocked={() => { setNeedUnlock(false); setError(''); client.invalidateQueries({ queryKey: ['rate', projectId] }); }} />}
    {applicationNumber && <div role="status" className="rounded-xl border bg-blue-50 p-4 space-y-2"><p className="break-all">Submission number: <strong>{applicationNumber}</strong></p><p className="text-sm">{saveMessage}</p><p className="text-xs">Keep this number private. It gives access to your application while it is editable.</p></div>}
    <form key={formVersion} onSubmit={submit} className="space-y-8">
      <fieldset disabled={busy || accessExpired} className="space-y-8 min-w-0">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 md:p-8 space-y-4"><h2 className="text-xl font-semibold">Green travel declaration</h2><p className="text-sm text-muted-foreground">Select green travel only if your entire journey to and from the activity is by car, bus, or train, without any flights. This enables food and accommodation receipts for your journey.</p>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={participant.greenTravel} onChange={e => {
            if (e.target.checked && tickets.some(ticket => ticket.mode === 'Flight')) { setGreenTravelConflictOpen(true); return; }
            if (e.target.checked) { setGreenDeclarationAccepted(false); setGreenDialogOpen(true); }
            else { setParticipant(p => ({ ...p, greenTravel: false })); setGreenDeclarationAccepted(false); setTickets(rows => rows.filter(t => !isReceipt(t))); }
          }} />My entire journey is green travel (no flights)</label>
          {participant.greenTravel && tickets.some(isReceipt) && <p className="text-sm text-muted-foreground">Unticking green travel removes food and accommodation receipts from this claim.</p>}
        </section>
        <section className="rounded-2xl border border-sky-200/80 bg-sky-50/30 p-5 shadow-sm md:p-8 space-y-6 dark:border-sky-900 dark:bg-sky-950/10">
          <SectionTitle number="01" title="Participant details" description="Select your country from the project’s participating countries. Fields marked * are required." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field id="first-name" label="First name (as in ID)" required autoComplete="given-name" maxLength={80} value={participant.firstName} onChange={e => updateParticipant('firstName', e.target.value)} />
            <Field id="last-name" label="Surname (as in ID)" required autoComplete="family-name" maxLength={80} value={participant.lastName} onChange={e => updateParticipant('lastName', e.target.value)} />
            <Field id="activity-start" label="Activity start date (set by admin)" type="date" readOnly value={settings.activityStartDate ?? ''} /><Field id="activity-end" label="Activity end date (set by admin)" type="date" readOnly value={settings.activityEndDate ?? ''} />
            <Field id="destination-city" label="Destination city (set by admin)" readOnly value={settings.destinationCity ?? 'Awaiting organizer configuration'} />
            <Field id="residence-city" label="City of residence" required readOnly={fixedResidence} maxLength={120} autoComplete="address-level2" value={participant.city} onChange={e => updateParticipant('city', e.target.value)} />
            <Field id="arrival-date" label="Arrival in destination country" type="date" required value={participant.arrivalDate} onChange={e => updateParticipant('arrivalDate', e.target.value)} />
            <Field id="departure-date" label="Departure from destination country" type="date" min={participant.arrivalDate || undefined} required value={participant.departureDate} onChange={e => updateParticipant('departureDate', e.target.value)} />
            <SelectField id="role" label="Role" required value={participant.role} onChange={e => updateParticipant('role', e.target.value)}>{['Participant', 'Team Leader', 'Facilitator'].map(role => <option key={role}>{role}</option>)}</SelectField>
            {fixedResidence
              ? <Field id="team" label="Country of residence" required readOnly value={participant.team} />
              : <SelectField id="team" label="Country of residence" required value={participant.team} onChange={e => updateParticipant('team', e.target.value)}><option value="">Select your country</option>{settings.countries.map(c => <option key={c} value={c}>{c}</option>)}</SelectField>}
            <Field id="citizenship" label="Citizenship" required maxLength={80} value={participant.citizenship} onChange={e => updateParticipant('citizenship', e.target.value)} />
            <Field id="dob" label="Date of birth" type="date" required min="1900-01-01" max={today()} autoComplete="bday" value={participant.dateOfBirth} onChange={e => updateParticipant('dateOfBirth', e.target.value)} />
            <Field id="email" label="Email" type="email" required maxLength={254} autoComplete="email" value={participant.email} onChange={e => updateParticipant('email', e.target.value)} />
            <Field id="phone" label="Phone number" type="tel" required maxLength={40} autoComplete="tel" placeholder="+49 …" value={participant.phone} onChange={e => updateParticipant('phone', e.target.value)} />
          </div>
        </section>
        <section className="rounded-2xl border border-indigo-200/80 bg-indigo-50/25 p-5 shadow-sm md:p-8 space-y-6 dark:border-indigo-900 dark:bg-indigo-950/10">
          <SectionTitle number="02" title="Travel tickets" description="Add each ticket separately. We convert amounts to euros using the exchange rate from the day you bought the ticket." />
          <p className="text-xs text-muted-foreground">On weekends and holidays, the most recent available ECB rate on or before the purchase date is shown. <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer" className="underline">Exchange-rate source</a></p>
          <div className="space-y-6">{tickets.map((ticket, i) => !isReceipt(ticket) ? renderTicket(ticket, i) : null)}</div>

          <div className="flex flex-wrap justify-between items-center gap-4"><Button type="button" variant="outline" disabled={tickets.length >= MAX_TICKETS} onClick={() => setTickets(rows => [...rows, newTicket()])}><Plus className="w-4 h-4 mr-2" />Add another ticket</Button><div className="text-right" aria-live="polite"><p className="text-xs uppercase tracking-wide text-muted-foreground">{completeRates ? 'Total in euros' : 'Total so far'}</p><p className="text-3xl font-semibold text-primary">{euro(total)}</p>{!completeRates && <p className="text-xs text-muted-foreground">Complete all ticket and receipt amounts and rates for the final total.</p>}</div></div>
          {participant.greenTravel && !tickets.some(t => t.mode === 'Flight') && <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 md:p-6 space-y-5"><h3 className="text-xl font-semibold">Food / accommodation invoices</h3><p className="text-sm text-muted-foreground">Upload food/accommodation invoices only if approved by the organizer. Add each invoice separately. These expenses are subject to your reimbursement limit. Up to {MAX_TICKETS} tickets and invoices combined.</p><div className="space-y-6">{tickets.map((ticket, i) => isReceipt(ticket) ? renderTicket(ticket, i) : null)}</div><Button type="button" variant="outline" disabled={tickets.length >= MAX_TICKETS} onClick={() => setTickets(rows => [...rows, { ...newTicket(), mode: 'Food', to: 'Food', travelDate: '' }])}><Plus className="w-4 h-4 mr-2" />Add food/accommodation invoice</Button></section>}

        </section>
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-5 shadow-sm md:p-8 space-y-4 dark:border-emerald-900 dark:bg-emerald-950/10">
          <h2 className="text-xl font-semibold">Reimbursement calculation</h2>
          <dl className="grid sm:grid-cols-2 gap-4"><div><dt className="text-sm text-muted-foreground">Submitted expenses</dt><dd className="font-semibold">{euro(total)}</dd></div><div><dt className="text-sm text-muted-foreground">Country limit</dt><dd className="font-semibold">{settings.countryLimits?.[participant.team] !== undefined ? euro(settings.countryLimits[participant.team]) : 'Select your country'}</dd></div></dl>
          <p className="text-sm text-muted-foreground">You can receive up to your submitted eligible expenses or your country’s limit, whichever is lower. The organizer can approve an extra amount separately.</p>

          <AddressField id="participant-notes" label="Notes for the organizer (optional)" rows={3} maxLength={2000} value={participant.notes} onChange={e => updateParticipant('notes', e.target.value)} />
        </section>
        <section className="rounded-2xl border border-violet-200/80 bg-violet-50/25 p-5 shadow-sm md:p-8 space-y-6 dark:border-violet-900 dark:bg-violet-950/10">
          <SectionTitle number="03" title="Bank details & signature" description="We use these details to send your reimbursement to your bank account." />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="bank-name" label="Bank name" required maxLength={160} value={participant.bankName} onChange={e => updateParticipant('bankName', e.target.value)} />
            <Field id="account-holder" label="Account holder" required maxLength={160} value={participant.accountHolder} onChange={e => updateParticipant('accountHolder', e.target.value)} />
            <Field id="signature-place" label="City where you are signing" required maxLength={120} value={participant.signaturePlace} onChange={e => updateParticipant('signaturePlace', e.target.value)} />
            <Field id="bank-account" label="Bank account / IBAN" required maxLength={80} value={participant.bankAccount} onChange={e => updateParticipant('bankAccount', e.target.value)} />
            <Field id="bic" label="BIC / SWIFT" required minLength={8} maxLength={11} value={participant.bic} onChange={e => updateParticipant('bic', e.target.value.toUpperCase())} />
            <AddressField id="participant-address" label="Participant address" required maxLength={500} autoComplete="street-address" value={participant.address} onChange={e => updateParticipant('address', e.target.value)} />
          </div>
          <div className="rounded-xl border border-violet-200 bg-background p-4 space-y-3 shadow-sm dark:border-violet-900"><h3 className="text-sm font-semibold">Participant signature *</h3><SignaturePad initialValue={signature} onChange={setSignature} disabled={busy || needUnlock} /></div>
          <div className="rounded-xl border bg-background/80 p-4 md:p-5 space-y-5">
            <h3 className="font-semibold">Declaration</h3>
            <p className="text-sm leading-relaxed">{declarationIntro}</p>
            <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed">{declarationPoints.map(point => { const colon = point.indexOf(':'); return <li key={point}>{colon > -1 ? <><strong>{point.slice(0, colon + 1)}</strong>{point.slice(colon + 1)}</> : point}</li>; })}</ol>
            <label className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm font-medium leading-relaxed cursor-pointer"><input type="checkbox" required checked={declaration} onChange={e => setDeclaration(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span>I have read and agree to all the declaration points above.</span></label>
          </div>
        </section>
      </fieldset>
      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive break-words">{error}</div>}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pb-6"><p className="text-xs text-muted-foreground flex gap-2 max-w-lg"><LockKeyhole className="w-4 h-4 shrink-0" />Save incomplete information and documents at any time. Submit Form sends your complete application for administrator approval.</p><Button type="button" size="lg" variant="outline" disabled={busy || accessExpired} onClick={saveDraft}>Save Form</Button><Button type="submit" size="lg" disabled={busy || needUnlock || !signature || !completeRates || rates.some(r => r.isFetching)} className="w-full sm:w-auto">{busy ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving submission…</> : <><Send className="w-4 h-4 mr-2" />Submit Form</>}</Button></div>
    </form>
    <Dialog open={greenDialogOpen} onOpenChange={open => { setGreenDialogOpen(open); if (!open && !participant.greenTravel) setGreenDeclarationAccepted(false); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Green Travel Declaration</DialogTitle><DialogDescription>Please read and confirm this declaration to select green travel.</DialogDescription></DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-semibold dark:border-emerald-900 dark:bg-emerald-950/20"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" checked={greenDeclarationAccepted} onChange={e => setGreenDeclarationAccepted(e.target.checked)} /><span>{greenTravelConfirmation}</span></label>
          {greenTravelDeclaration.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <DialogFooter><Button type="button" disabled={!greenDeclarationAccepted} onClick={() => { setParticipant(p => ({ ...p, greenTravel: true })); setGreenDialogOpen(false); }}>Confirm green travel</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={greenTravelConflictOpen} onOpenChange={setGreenTravelConflictOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Flight is not eligible for green travel</DialogTitle><DialogDescription>You cannot select both Flight and Green travel. Please choose a low-emission mode of travel before selecting Green travel, or untick Green travel before selecting Flight.</DialogDescription></DialogHeader>
        <DialogFooter><Button type="button" onClick={() => setGreenTravelConflictOpen(false)}>OK</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex gap-4"><span className="text-sm font-semibold text-primary rounded-xl bg-primary/10 w-10 h-10 flex items-center justify-center shrink-0">{number}</span><div className="space-y-1"><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></div>;
}
