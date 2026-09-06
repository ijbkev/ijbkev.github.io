import { useState, type FormEvent } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from './Field';
import { api } from '@/lib/reimbursement-api';

export default function AccessGate({ projectId, onUnlocked }: { projectId: string; onUnlocked: () => void }) {
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api(`/projects/${projectId}/unlock`, { method: 'POST', body: JSON.stringify({ code }) }); setCode(''); onUnlocked(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-2xl border bg-card p-6 md:p-8 space-y-5 max-w-xl mx-auto">
    <KeyRound className="text-primary w-8 h-8" />
    <div className="space-y-2"><h2 className="text-2xl font-semibold">Participant access</h2><p className="text-muted-foreground">Enter the secret code shared by your project organizer to open the reimbursement form.</p></div>
    <Field id="project-access-code" label="Project access code" type="password" value={code} onChange={e => setCode(e.target.value)} required maxLength={128} autoComplete="off" disabled={busy} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="w-full">{busy ? 'Checking code…' : 'Open reimbursement form'}<ArrowRight className="w-4 h-4 ml-2" /></Button>
    <p className="text-xs text-muted-foreground">Your submission will be accessible to project administrators only.</p>
  </form>;
}
