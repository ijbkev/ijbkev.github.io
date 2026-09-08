import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Landmark, Send } from 'lucide-react';
import { acceptsReimbursements, projects } from '@/data/projects';
import { api, ApiError } from '@/lib/reimbursement-api';
import { Button } from '@/components/ui/button';
import { Field, SelectField } from '@/components/reimbursement/Field';
import SignaturePad from '@/components/reimbursement/SignaturePad';
import AccessGate from '@/components/reimbursement/AccessGate';
import { euro, organisationDeclarationSchema, organisationPaymentDeclaration, today, type OrganisationFormData, type ProjectSettings } from '../../shared/reimbursement';
import NotFound from './NotFound';

export default function OrganisationReimbursement() {
  const { projectId } = useParams();
  const project = projects.find(item => item.id === projectId && acceptsReimbursements(item));
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['organisation-session', projectId], queryFn: () => api<ProjectSettings>(`/projects/${projectId}/organisation-session`), enabled: !!project, retry: false, refetchOnWindowFocus: false });
  if (!project) return <NotFound />;
  return <div className="page-shell py-10 md:py-16 space-y-8">
    <Link to={`/projects/${project.id}/partner-dashboard`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />Back to Partner Dashboard</Link>
    <header className="max-w-4xl space-y-3"><p className="text-sm uppercase tracking-[0.18em] text-primary">{project.title}</p><h1 className="text-3xl md:text-4xl font-semibold">Reimbursement Declaration</h1><p className="text-sm text-muted-foreground">To be filled by the team leader or a member of the sending organisation after participant reimbursements and any extra amounts have been approved.</p></header>
    {session.isPending ? <p role="status">Checking project access…</p> : session.isError ? (session.error instanceof ApiError && session.error.status === 401 ? <AccessGate audience="organisation" projectId={project.id} onUnlocked={() => client.invalidateQueries({ queryKey: ['organisation-session', projectId] })} /> : <p role="alert">{session.error.message}</p>) : <OrganisationForm projectId={project.id} settings={session.data} />}
  </div>;
}

function OrganisationForm({ projectId, settings }: { projectId: string; settings: ProjectSettings }) {
  const [country, setCountry] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [submitterRole, setSubmitterRole] = useState<'team-leader' | 'sending-organisation-member'>('team-leader');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPosition, setSubmitterPosition] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [signaturePlace, setSignaturePlace] = useState('');
  const [signatureDate, setSignatureDate] = useState(today());
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  const [swift, setSwift] = useState('');
  const [signature, setSignature] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; country: string; totalCents: number } | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const data = useQuery({ queryKey: ['organisation-form', projectId, country], queryFn: () => api<OrganisationFormData>(`/projects/${projectId}/organisation-form?country=${encodeURIComponent(country)}`), enabled: !!country, retry: false });
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = organisationDeclarationSchema.safeParse({ requestId, organisationName, country, submitterRole, submitterName, submitterPosition, submitterPhone, submitterEmail, signaturePlace, signatureDate, accountHolder, iban, bankCountry, swift, signature, declaration });
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join('; ')); return; }
    if (!data.data?.participants.length) { setError('No completed participant reimbursements were found for this country.'); return; }
    setBusy(true);
    try { setReceipt(await api(`/projects/${projectId}/organisation-declarations`, { method: 'POST', body: JSON.stringify(parsed.data) })); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  if (receipt) return <section className="max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-4"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" /><h2 className="text-2xl font-semibold">Declaration submitted</h2><p>The declaration for {receipt.country} has been saved for the project administrator.</p><p className="text-xl font-semibold">Total payment: {euro(receipt.totalCents)}</p></section>;
  return <form onSubmit={submit} className="space-y-7">
    <section className="rounded-2xl border border-sky-200 bg-sky-50/30 p-5 md:p-8 space-y-6">
      <div className="flex gap-3"><Landmark className="h-7 w-7 text-primary" /><div><h2 className="text-xl font-semibold">Organisation and country</h2><p className="text-sm text-muted-foreground">Choose the country to load its completed participant reimbursements.</p></div></div>
      <div className="grid md:grid-cols-2 gap-5"><Field id="organisation-name" label="Organisation name" required maxLength={200} value={organisationName} onChange={event => setOrganisationName(event.target.value)} /><SelectField id="organisation-country" label="Country" required value={country} onChange={event => { setCountry(event.target.value); setBankCountry(value => value || event.target.value); }}><option value="">Select country</option>{settings.countries.map(value => <option key={value}>{value}</option>)}</SelectField></div>
    </section>
    {country && <section className="rounded-2xl border bg-card p-5 md:p-8 space-y-5"><h2 className="text-xl font-semibold">Participants and reimbursement</h2>
      {data.isPending ? <p role="status">Loading participant reimbursements…</p> : data.isError ? <p role="alert" className="text-destructive">{data.error.message}</p> : data.data.participants.length === 0 ? <p className="rounded-lg bg-amber-50 p-4 text-sm">No completed participant reimbursements were found for {country}.</p> : <><div className="overflow-x-auto rounded-xl border border-slate-300"><table className="w-full border-collapse text-sm"><thead className="bg-slate-100"><tr className="text-left"><th className="border-b border-r border-slate-300 p-3">Role</th><th className="border-b border-r border-slate-300 p-3">Name</th><th className="border-b border-slate-300 p-3 text-right">Reimbursement to be paid</th></tr></thead><tbody>{data.data.participants.map((item, index) => <tr key={`${item.label}-${item.name}`} className={index % 2 ? 'bg-slate-50/70' : 'bg-white'}><td className="border-b border-r border-slate-200 p-3 font-medium">{item.label}</td><td className="border-b border-r border-slate-200 p-3">{item.name}</td><td className="border-b border-slate-200 p-3 text-right font-semibold">{euro(item.reimbursementCents)}</td></tr>)}</tbody><tfoot><tr className="bg-blue-50 text-base"><th colSpan={2} className="border-r border-slate-300 p-3 text-left">Total reimbursement to be paid by bank transfer</th><th className="p-3 text-right">{euro(data.data.totalCents)}</th></tr></tfoot></table></div></>}
    </section>}
    {data.data?.participants.length ? <>
      <section className="rounded-2xl border border-violet-200 bg-violet-50/30 p-5 md:p-8 space-y-5"><h2 className="text-xl font-semibold">Submitter and bank details</h2><div className="grid md:grid-cols-2 gap-5"><SelectField id="submitter-role" label="I am submitting as" required value={submitterRole} onChange={event => { setSubmitterRole(event.target.value as typeof submitterRole); if (event.target.value === 'team-leader') setSubmitterPosition(''); }}><option value="team-leader">Team leader</option><option value="sending-organisation-member">Member of the sending organisation</option></SelectField><Field id="submitter-name" label="Full name" required maxLength={160} value={submitterName} onChange={event => setSubmitterName(event.target.value)} />{submitterRole === 'sending-organisation-member' && <Field id="submitter-position" label="Position in the sending organisation" required maxLength={160} value={submitterPosition} onChange={event => setSubmitterPosition(event.target.value)} />}<Field id="submitter-phone" label="Contact number" type="tel" required maxLength={40} placeholder="+49 …" value={submitterPhone} onChange={event => setSubmitterPhone(event.target.value)} /><Field id="submitter-email" label="Email" type="email" required maxLength={254} value={submitterEmail} onChange={event => setSubmitterEmail(event.target.value)} /><Field id="signature-place" label="Place of signature" required maxLength={120} value={signaturePlace} onChange={event => setSignaturePlace(event.target.value)} /><Field id="signature-date" label="Date" type="date" required max={today()} value={signatureDate} onChange={event => setSignatureDate(event.target.value)} /><Field id="account-holder" label="Account holder" required maxLength={160} value={accountHolder} onChange={event => setAccountHolder(event.target.value)} /><Field id="iban" label="IBAN" required maxLength={80} value={iban} onChange={event => setIban(event.target.value)} /><Field id="bank-country" label="Bank country" required maxLength={80} value={bankCountry} onChange={event => setBankCountry(event.target.value)} /><Field id="swift" label="SWIFT / BIC" required minLength={8} maxLength={11} value={swift} onChange={event => setSwift(event.target.value.toUpperCase())} /></div><div className="rounded-xl border bg-background p-4 space-y-3"><h3 className="font-semibold">{submitterRole === 'team-leader' ? 'Signature of the team leader' : 'Signature of the sending organisation member'} — {submitterName || 'name required'} *</h3><SignaturePad onChange={setSignature} disabled={busy} /></div></section>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 md:p-8 space-y-5"><h2 className="text-xl font-semibold">Declaration</h2><dl className="grid sm:grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Project</dt><dd className="font-medium">{data.data.projectName}</dd></div><div><dt className="text-muted-foreground">Project code</dt><dd className="font-medium">{data.data.projectCode}</dd></div><div><dt className="text-muted-foreground">Place</dt><dd className="font-medium">{data.data.destinationCity}</dd></div><div><dt className="text-muted-foreground">Dates</dt><dd className="font-medium">{data.data.activityStartDate} to {data.data.activityEndDate}</dd></div></dl><p className="leading-relaxed">{organisationPaymentDeclaration(data.data)}</p><label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-background p-4 text-sm"><input type="checkbox" required checked={declaration} onChange={event => setDeclaration(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" /><span>I confirm that the participant list, reimbursement amounts, organisation details, and bank details shown above are correct.</span></label></section>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" size="lg" disabled={busy || !signature || !declaration}><Send className="mr-2 h-4 w-4" />{busy ? 'Submitting…' : 'Submit declaration'}</Button></div>
    </> : null}
  </form>;
}
