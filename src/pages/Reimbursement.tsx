import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, CheckCircle2, FileText, LockKeyhole, Send, RefreshCw } from 'lucide-react';
import { projects } from '@/data/projects';
import { Button } from '@/components/ui/button';
import { Field, SelectField, AddressField } from '@/components/reimbursement/Field';
import SignaturePad from '@/components/reimbursement/SignaturePad';
import AccessGate from '@/components/reimbursement/AccessGate';
import { api, ApiError } from '@/lib/reimbursement-api';
import { declarationPoints, currencies, travelModes, claimSchema, purchaseDateSchema, euroCents, euro, today, MAX_TICKETS, MAX_FILE_SIZE, MAX_TOTAL_SIZE, type Participant, type ProjectSettings, type Rate, type TicketInput } from '../../shared/reimbursement';
import NotFound from './NotFound';

type DraftPass = { journey: 'outbound' | 'return'; from: string; to: string; file: File | null };
type DraftTicket = Omit<TicketInput, 'amount' | 'boardingPasses'> & { id: string; amount: string; file: File | null; boardingPasses: DraftPass[] };
const newPass = (journey: DraftPass['journey'], from = '', to = ''): DraftPass => ({ journey, from, to, file: null });
const newTicket = (): DraftTicket => ({ id: crypto.randomUUID(), purchaseDate: '', travelDate: '', from: '', to: '', mode: 'Train', ticketType: 'Electronic ticket', currency: 'EUR', amount: '', file: null, journeyType: 'one-way', connections: false, boardingPasses: [] });
const blankParticipant: Participant = { firstName: '', lastName: '', name: '', citizenship: '', team: '', city: '', notes: '', greenTravel: false, arrivalDate: '', departureDate: '', role: 'Participant', bankName: '', accountHolder: '', signaturePlace: '', dateOfBirth: '', email: '', phone: '', bankAccount: '', bic: '', bankAddress: '', address: '' };

export default function Reimbursement() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId && p.status === 'Upcoming');
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['participant-session', projectId], queryFn: () => api<ProjectSettings>(`/projects/${projectId}/session`), enabled: !!project, retry: false, refetchOnWindowFocus: false });
  if (!project) return <NotFound />;
  return <div className="page-shell py-10 md:py-16 space-y-8">
    <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />Back to {project.title}</Link>
    <header className="space-y-3"><p className="text-sm uppercase tracking-[0.18em] text-primary">{project.title}</p><h1 className="text-3xl md:text-4xl font-semibold">Travel reimbursement</h1><p className="text-muted-foreground max-w-2xl">All your travel details, tickets, and signature in one place.</p></header>
    {session.isPending ? <p role="status">Checking participant access…</p> : session.isError ? (session.error instanceof ApiError && session.error.status === 401 ? <AccessGate projectId={project.id} onUnlocked={() => client.invalidateQueries({ queryKey: ['participant-session', projectId] })} /> : <div className="rounded-xl border bg-card p-6 space-y-4"><p role="alert">{session.error.message}</p><Button variant="outline" onClick={() => session.refetch()}>Try again</Button></div>) : <ClaimForm key={project.id} projectId={project.id} settings={session.data} />}
  </div>;
}

function ClaimForm({ projectId, settings }: { projectId: string; settings: ProjectSettings }) {
  const client = useQueryClient();
  const [participant, setParticipant] = useState<Participant>({ ...blankParticipant });
  const [tickets, setTickets] = useState<DraftTicket[]>([newTicket()]);
  const [signature, setSignature] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needUnlock, setNeedUnlock] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; reference?: string; totalCents?: number; finalCents?: number } | null>(null);
  const [formVersion, setFormVersion] = useState(0);
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
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = claimSchema.safeParse({ requestId, participant, tickets: tickets.map(t => ({ ...t, amount: Number(t.amount) })), signature, declaration });
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join(' → ')}: ${i.message}`).join('; ')); return; }
    if (!signature) { setError('Please draw your signature.'); return; }
    const missing = tickets.findIndex(t => !t.file);
    if (missing >= 0) { setError(`Please upload the file for ticket ${missing + 1}.`); return; }
    if (tickets.reduce((sum, t) => sum + (t.file?.size ?? 0) + t.boardingPasses.reduce((n, p) => n + (p.file?.size ?? 0), 0), 0) > MAX_TOTAL_SIZE) { setError('Total uploads must not exceed 40 MB.'); return; }
    setBusy(true);
    const form = new FormData(); form.append('claim', JSON.stringify(parsed.data));
    tickets.forEach((t, i) => { form.append(`ticket-${i}`, t.file!); t.boardingPasses.forEach((p, j) => { if (p.file) form.append(`boarding-${i}-${j}`, p.file); }); });
    try {
      const result = await api<{ id: string; reference?: string; totalCents?: number; finalCents?: number }>(`/projects/${projectId}/submissions`, { method: 'POST', body: form });
      setReceipt(result); setParticipant({ ...blankParticipant }); setTickets([newTicket()]); setSignature(''); setDeclaration(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 401) setNeedUnlock(true); }
    finally { setBusy(false); }
  }
  if (receipt) return <section className="max-w-2xl mx-auto rounded-2xl border bg-card p-8 md:p-12 text-center space-y-5">
    <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" /><h2 className="text-3xl font-semibold">Reimbursement submitted</h2>
    <p className="text-muted-foreground">Your details and tickets have been saved. Your project administrator can now download the complete PDF, with one labeled page for each ticket.</p>
    {receipt.totalCents !== undefined && <p className="text-sm">Submitted expenses: {euro(receipt.totalCents)}</p>}{receipt.finalCents !== undefined && <p className="text-xl font-semibold text-primary">Reimbursement amount: {euro(receipt.finalCents)}</p>}
    <p className="text-sm break-all">Submission reference: <strong>{receipt.reference ?? receipt.id}</strong></p><p className="text-xs text-muted-foreground">Keep this reference if you need to contact your organizer.</p>
    <div className="flex flex-wrap justify-center gap-3"><Button asChild><Link to={`/projects/${projectId}`}>Back to project</Link></Button><Button variant="outline" onClick={() => { setReceipt(null); setRequestId(crypto.randomUUID()); setFormVersion(v => v + 1); }}>Start another participant’s form</Button></div>
  </section>;
  return <div className="space-y-6">
    {accessExpired && <AccessGate projectId={projectId} onUnlocked={() => { setNeedUnlock(false); setError(''); client.invalidateQueries({ queryKey: ['rate', projectId] }); }} />}
    <form key={formVersion} onSubmit={submit} className="space-y-8">
      <fieldset disabled={busy || accessExpired} className="space-y-8 min-w-0">
        <section className="rounded-2xl border bg-card p-5 md:p-8 space-y-6">
          <SectionTitle number="01" title="Participant details" description="Select your country from the project’s participating countries. Fields marked * are required." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field id="first-name" label="First name (as in ID)" required autoComplete="given-name" maxLength={80} value={participant.firstName} onChange={e => updateParticipant('firstName', e.target.value)} />
            <Field id="last-name" label="Surname (as in ID)" required autoComplete="family-name" maxLength={80} value={participant.lastName} onChange={e => updateParticipant('lastName', e.target.value)} />
            <Field id="activity-start" label="Activity start date (set by admin)" type="date" readOnly value={settings.activityStartDate ?? ''} /><Field id="activity-end" label="Activity end date (set by admin)" type="date" readOnly value={settings.activityEndDate ?? ''} />
            <Field id="destination-city" label="Destination city (set by admin)" readOnly value={settings.destinationCity ?? 'Awaiting organizer configuration'} />
            <Field id="residence-city" label="City of residence" required maxLength={120} autoComplete="address-level2" value={participant.city} onChange={e => updateParticipant('city', e.target.value)} />
            <Field id="arrival-date" label="Arrival in destination country" type="date" required value={participant.arrivalDate} onChange={e => updateParticipant('arrivalDate', e.target.value)} />
            <Field id="departure-date" label="Departure from destination country" type="date" min={participant.arrivalDate || undefined} required value={participant.departureDate} onChange={e => updateParticipant('departureDate', e.target.value)} />
            <SelectField id="role" label="Role" required value={participant.role} onChange={e => updateParticipant('role', e.target.value)}>{['Participant', 'Team Leader', 'Facilitator'].map(role => <option key={role}>{role}</option>)}</SelectField>
            <SelectField id="team" label="Country of residence" required value={participant.team} onChange={e => updateParticipant('team', e.target.value)}><option value="">Select your country</option>{settings.countries.map(c => <option key={c} value={c}>{c}</option>)}</SelectField>
            <Field id="citizenship" label="Citizenship" required maxLength={80} value={participant.citizenship} onChange={e => updateParticipant('citizenship', e.target.value)} />
            <Field id="dob" label="Date of birth" type="date" required min="1900-01-01" max={today()} autoComplete="bday" value={participant.dateOfBirth} onChange={e => updateParticipant('dateOfBirth', e.target.value)} />
            <Field id="email" label="Email" type="email" required maxLength={254} autoComplete="email" value={participant.email} onChange={e => updateParticipant('email', e.target.value)} />
            <Field id="phone" label="Phone number" type="tel" required maxLength={40} autoComplete="tel" placeholder="+49 …" value={participant.phone} onChange={e => updateParticipant('phone', e.target.value)} />
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5 md:p-8 space-y-6">
          <SectionTitle number="02" title="Travel tickets" description="Add each ticket separately. Amounts are converted using the historical rate for the purchase date." />
          <p className="text-xs text-muted-foreground">On weekends and holidays, the most recent available ECB rate on or before the purchase date is shown. <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer" className="underline">Exchange-rate source</a></p>
          <div className="space-y-5">{tickets.map((ticket, i) => <article key={ticket.id} className="rounded-xl border bg-background p-4 md:p-5 space-y-5">
            <div className="flex justify-between items-center"><h3 className="font-semibold flex items-center gap-2"><span className="rounded-lg bg-primary/10 text-primary px-2.5 py-1">{i + 1}</span>Ticket {i + 1}</h3><Button type="button" size="sm" variant="ghost" disabled={tickets.length === 1} onClick={() => setTickets(rows => rows.filter(row => row.id !== ticket.id))} aria-label={`Remove ticket ${i + 1}`}><Trash2 className="w-4 h-4 mr-1" />Remove</Button></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field id={`${ticket.id}-purchase`} label="Ticket purchase date" type="date" required min="1999-01-04" max={today()} value={ticket.purchaseDate} onChange={e => updateTicket(ticket.id, { purchaseDate: e.target.value })} />
              <Field id={`${ticket.id}-travel`} label="Travel date" type="date" required min={ticket.purchaseDate || undefined} value={ticket.travelDate} onChange={e => updateTicket(ticket.id, { travelDate: e.target.value })} />
              <Field id={`${ticket.id}-from`} label="From" required maxLength={120} placeholder="City / airport / station" value={ticket.from} onChange={e => updateTicket(ticket.id, { from: e.target.value })} />
              <Field id={`${ticket.id}-to`} label="To" required maxLength={120} placeholder="City / airport / station" value={ticket.to} onChange={e => updateTicket(ticket.id, { to: e.target.value })} />
              <SelectField id={`${ticket.id}-mode`} label="Mode of travel" required value={ticket.mode} onChange={e => updateTicket(ticket.id, { mode: e.target.value as DraftTicket['mode'], boardingPasses: e.target.value === 'Flight' ? [newPass('outbound', ticket.from, ticket.to)] : [], journeyType: 'one-way', connections: false })}>{travelModes.map(m => <option key={m}>{m}</option>)}</SelectField>
              <SelectField id={`${ticket.id}-type`} label="Ticket format" value={ticket.ticketType} onChange={e => updateTicket(ticket.id, { ticketType: e.target.value as DraftTicket['ticketType'] })}><option>Paper ticket</option><option>Electronic ticket</option></SelectField>
              <SelectField id={`${ticket.id}-currency`} label="Purchase currency" required value={ticket.currency} onChange={e => updateTicket(ticket.id, { currency: e.target.value as DraftTicket['currency'] })}>{currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</SelectField>
              <Field id={`${ticket.id}-amount`} label={`Amount paid (${ticket.currency})`} type="number" inputMode="decimal" required min="0.01" max="100000000" step="0.01" value={ticket.amount} onChange={e => updateTicket(ticket.id, { amount: e.target.value })} />
              <div className="space-y-2"><span className="block text-sm font-medium">Amount in euros</span><output className="flex h-10 items-center rounded-md bg-primary/5 px-3 font-semibold text-primary" aria-live="polite">{rates[i].data && Number(ticket.amount) > 0 ? euro(euroCents(Number(ticket.amount), rates[i].data.rate)) : '—'}</output></div>
            </div>
            <div aria-live="polite" className="text-xs text-muted-foreground">
              {rates[i].isError ? <p className="text-destructive">{rates[i].error.message} <button type="button" className="underline font-medium" onClick={() => rates[i].refetch()}>Retry rate</button></p> : rates[i].isFetching ? 'Fetching historical exchange rate…' : rates[i].data ? `1 ${ticket.currency} = ${rates[i].data.rate} EUR · Rate date: ${rates[i].data.rateDate} · ${rates[i].data.source}` : 'Select a purchase date to calculate the euro amount.'}
            </div>
            <div className="rounded-lg border border-dashed p-4 space-y-2">
              <Field id={`${ticket.id}-file`} label={`Upload ticket ${i + 1}`} type="file" accept="application/pdf,image/*,.pdf" required onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file && (file.size > MAX_FILE_SIZE)) { e.target.value = ''; updateTicket(ticket.id, { file: null }); setError(`Ticket ${i + 1}: upload a PDF or image no larger than 10 MB.`); return; }
                updateTicket(ticket.id, { file }); setError('');
              }} />
              <p className="text-xs text-muted-foreground">PDF or image · Up to 10 MB per file, 40 MB total. Edited PDFs are accepted. Document warnings do not block generation.</p>
              {ticket.file && <p className="text-xs text-primary break-all"><FileText className="w-3 h-3 inline mr-1" />{ticket.file.name} · {(ticket.file.size / 1024 / 1024).toFixed(2)} MB</p>}
            </div>
            {ticket.mode === 'Flight' && <div className="border-l-2 border-primary/30 pl-4 space-y-4">
              <h4 className="font-semibold">Flight booking and boarding passes</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField id={`${ticket.id}-journey`} label="Booking" value={ticket.journeyType ?? 'one-way'} onChange={e => {
                  const journeyType = e.target.value as DraftTicket['journeyType'];
                  updateTicket(ticket.id, { journeyType, boardingPasses: journeyType === 'round-trip' ? [...ticket.boardingPasses.filter(p => p.journey === 'outbound'), newPass('return', ticket.to, ticket.from)] : ticket.boardingPasses.filter(p => p.journey === 'outbound') });
                }}><option value="one-way">One-way</option><option value="round-trip">Round trip / return journey</option></SelectField>
                <SelectField id={`${ticket.id}-connections`} label="Multiple flight segments / connections?" value={ticket.connections ? 'yes' : 'no'} onChange={e => {
                  const connections = e.target.value === 'yes';
                  updateTicket(ticket.id, { connections, boardingPasses: connections ? ticket.boardingPasses : ['outbound', ...(ticket.journeyType === 'round-trip' ? ['return'] : [])].map(j => ticket.boardingPasses.find(p => p.journey === j) ?? newPass(j as DraftPass['journey'])) });
                }}><option value="no">No - direct flights</option><option value="yes">Yes - select segment counts below</option></SelectField>
              </div>
              <p className="text-sm">Route: {ticket.from || 'From'} → {ticket.to || 'To'}{ticket.journeyType === 'round-trip' ? ` → ${ticket.from || 'From'}` : ''}. Enter the full invoice amount once. Add separate invoices as separate expenses.</p>
              {(['outbound', ...(ticket.journeyType === 'round-trip' ? ['return'] : [])] as DraftPass['journey'][]).map(journey => <section key={journey} className="space-y-3">
                <h5 className="font-medium">{journey === 'outbound' ? 'Outbound journey' : 'Return journey'}</h5>
                {ticket.connections && <SelectField id={`${ticket.id}-${journey}-count`} label="Number of flight segments" value={ticket.boardingPasses.filter(p => p.journey === journey).length} onChange={e => {
                  const old = ticket.boardingPasses.filter(p => p.journey === journey);
                  const changed = Array.from({ length: Number(e.target.value) }, (_, n) => old[n] ?? newPass(journey));
                  const other = ticket.boardingPasses.filter(p => p.journey !== journey);
                  updateTicket(ticket.id, { boardingPasses: journey === 'outbound' ? [...changed, ...other] : [...other, ...changed] });
                }}>{Array.from({ length: 12 }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}</SelectField>}
                {ticket.boardingPasses.map((pass, j) => pass.journey !== journey ? null : <div key={`${journey}-${j}`} className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-medium">Boarding pass {ticket.boardingPasses.slice(0, j + 1).filter(p => p.journey === journey).length} · €0</p>
                  <div className="grid sm:grid-cols-2 gap-3">{(['from', 'to'] as const).map(field => <Field key={field} id={`${ticket.id}-pass-${j}-${field}`} label={`${field === 'from' ? 'From' : 'To'} airport`} maxLength={120} value={pass[field]} onChange={e => updateTicket(ticket.id, { boardingPasses: ticket.boardingPasses.map((p, n) => n === j ? { ...p, [field]: e.target.value } : p) })} />)}</div>
                  <Field id={`${ticket.id}-pass-${j}`} label="Upload boarding pass (PDF or image)" type="file" accept="application/pdf,image/*,.pdf" onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > MAX_FILE_SIZE) { e.target.value = ''; setError('Boarding passes must be no larger than 10 MB.'); return; }
                    updateTicket(ticket.id, { boardingPasses: ticket.boardingPasses.map((p, n) => n === j ? { ...p, file } : p) });
                  }} />
                  {pass.file ? <p className="text-xs break-all">{pass.file.name}</p> : <p role="alert" className="text-sm text-red-700">Boarding pass missing. You can still submit and generate the PDF.</p>}
                </div>)}
              </section>)}
            </div>}
          </article>)}</div>
          <div className="flex flex-wrap justify-between items-center gap-4"><Button type="button" variant="outline" disabled={tickets.length >= MAX_TICKETS} onClick={() => setTickets(rows => [...rows, newTicket()])}><Plus className="w-4 h-4 mr-2" />Add another ticket</Button><div className="text-right" aria-live="polite"><p className="text-xs uppercase tracking-wide text-muted-foreground">{completeRates ? 'Total in euros' : 'Calculated subtotal'}</p><p className="text-3xl font-semibold text-primary">{euro(total)}</p>{!completeRates && <p className="text-xs text-muted-foreground">Complete all ticket amounts and rates for the final total.</p>}</div></div>
        </section>
        <section className="rounded-2xl border bg-card p-5 md:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Reimbursement calculation</h2>
          <dl className="grid sm:grid-cols-2 gap-4"><div><dt className="text-sm text-muted-foreground">Submitted expenses</dt><dd className="font-semibold">{euro(total)}</dd></div><div><dt className="text-sm text-muted-foreground">Country limit</dt><dd className="font-semibold">{settings.countryLimits?.[participant.team] !== undefined ? euro(settings.countryLimits[participant.team]) : 'Select a configured country'}</dd></div></dl>
          <p className="text-sm text-muted-foreground">Reimbursement is capped at your eligible expenses and country limit. Any extra reimbursement requires separate administrator approval and is added to this amount.</p>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={participant.greenTravel} onChange={e => setParticipant(p => ({ ...p, greenTravel: e.target.checked }))} />Green travel (main journey by low-emission transport)</label>
          <AddressField id="participant-notes" label="Notes for the organizer (optional)" rows={3} maxLength={2000} value={participant.notes} onChange={e => updateParticipant('notes', e.target.value)} />
        </section>
        <section className="rounded-2xl border bg-card p-5 md:p-8 space-y-6">
          <SectionTitle number="03" title="Bank details & signature" description="These details are used by the administrator to arrange your reimbursement." />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="bank-name" label="Bank name" required maxLength={160} value={participant.bankName} onChange={e => updateParticipant('bankName', e.target.value)} />
            <Field id="account-holder" label="Account holder" required maxLength={160} value={participant.accountHolder} onChange={e => updateParticipant('accountHolder', e.target.value)} />
            <Field id="signature-place" label="Place of signature" required maxLength={120} value={participant.signaturePlace} onChange={e => updateParticipant('signaturePlace', e.target.value)} />
            <Field id="bank-account" label="Bank account / IBAN" required maxLength={80} value={participant.bankAccount} onChange={e => updateParticipant('bankAccount', e.target.value)} />
            <Field id="bic" label="BIC / SWIFT" required minLength={8} maxLength={11} value={participant.bic} onChange={e => updateParticipant('bic', e.target.value.toUpperCase())} />
            <AddressField id="bank-address" label="Bank address" required maxLength={500} value={participant.bankAddress} onChange={e => updateParticipant('bankAddress', e.target.value)} />
            <AddressField id="participant-address" label="Participant address" required maxLength={500} autoComplete="street-address" value={participant.address} onChange={e => updateParticipant('address', e.target.value)} />
          </div>
          <div className="space-y-3"><h3 className="text-sm font-medium">Participant signature *</h3><SignaturePad onChange={setSignature} disabled={busy || needUnlock} /></div>
          <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed">{declarationPoints.map(point => { const colon = point.indexOf(':'); return <li key={point}>{colon > -1 ? <><strong>{point.slice(0, colon + 1)}</strong>{point.slice(colon + 1)}</> : point}</li>; })}</ol>
          <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer"><input type="checkbox" required checked={declaration} onChange={e => setDeclaration(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span>I have read and agree to all the declaration points above.</span></label>
        </section>
      </fieldset>
      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive break-words">{error}</div>}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pb-6"><p className="text-xs text-muted-foreground flex gap-2 max-w-lg"><LockKeyhole className="w-4 h-4 shrink-0" />Only administrators can view your submission and download its PDF. Keep this page open until you see the submission confirmation.</p><Button type="submit" size="lg" disabled={busy || needUnlock || !signature || !completeRates || rates.some(r => r.isFetching)} className="w-full sm:w-auto">{busy ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving submission…</> : <><Send className="w-4 h-4 mr-2" />Submit reimbursement</>}</Button></div>
    </form>
  </div>;
}
function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex gap-4"><span className="text-sm font-semibold text-primary rounded-xl bg-primary/10 w-10 h-10 flex items-center justify-center shrink-0">{number}</span><div className="space-y-1"><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></div>;
}
