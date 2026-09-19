import { useState } from 'react';
import { Fingerprint, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/reimbursement/Field';
import { api } from '@/lib/reimbursement-api';
import { passkeyError, passkeysSupported, registerPasskey, signInWithPasskey } from '@/lib/admin-passkeys';

type SavedPasskey = { id: string; label: string; created_at: string; last_used_at: string | null };
export function PasskeySignIn({ onSuccess, disabled = false }: { onSuccess: () => Promise<void>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!passkeysSupported()) return <p className="text-xs text-muted-foreground">Passkey sign-in needs a supported browser and HTTPS.</p>;
  async function login() {
    setBusy(true); setError('');
    try { await signInWithPasskey(); await onSuccess(); } catch (e) { setError(passkeyError(e)); } finally { setBusy(false); }
  }
  return <div className="space-y-2"><Button type="button" variant="outline" className="w-full" disabled={disabled || busy} onClick={login}><Fingerprint className="w-4 h-4 mr-2" />{busy ? 'Waiting for your passkey…' : 'Sign in with passkey'}</Button><p className="text-xs text-muted-foreground">Already registered? Use Touch ID or your device’s screen lock. To add your first passkey, sign in with your password.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}

export function AdminPasskeys() {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<SavedPasskey[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('My MacBook');
  const [removing, setRemoving] = useState<SavedPasskey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() { const data = await api<{ passkeys: SavedPasskey[] }>('/admin/passkeys'); setKeys(data.passkeys); setLoaded(true); }
  async function toggle() {
    setOpen(!open); setError(''); setMessage(''); setPassword(''); setRemoving(null);
    if (!open) { setBusy(true); try { await load(); } catch (e) { setError(passkeyError(e)); } finally { setBusy(false); } }
  }
  async function register() {
    setBusy(true); setError(''); setMessage('');
    try { await registerPasskey(password, label); setPassword(''); await load(); setMessage('Passkey added. You can now use it for the admin console and deadline planner.'); }
    catch (e) { setError(passkeyError(e)); } finally { setPassword(''); setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true); setError(''); setMessage('');
    try { await api('/admin/passkeys/remove', { method: 'POST', body: JSON.stringify({ id: removing.id, password }) }); setRemoving(null); setPassword(''); await load(); setMessage('Passkey removed from this website. Your admin password still works.'); }
    catch (e) { setError(passkeyError(e)); } finally { setPassword(''); setBusy(false); }
  }
  return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between gap-4 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-slate-100 p-2 text-slate-600"><KeyRound className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-medium">Admin security</p><p className="truncate text-xs text-muted-foreground">Password and passkey sign-in</p></div></div><Button type="button" size="sm" variant="ghost" aria-expanded={open} disabled={busy} onClick={toggle}>{open ? 'Close' : 'Manage passkeys'}</Button></div>{open && <div className="max-w-2xl space-y-5 border-t px-4 py-5"><p className="text-sm text-muted-foreground">Register a passkey to sign in with Touch ID or your device’s screen lock. Your administrator password remains available.</p>
    {loaded && <ul className="space-y-2">{keys.map(key => <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-medium break-words">{key.label}</p><p className="text-xs text-muted-foreground">Added {new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}` : ''}</p></div><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setRemoving(key); setPassword(''); setError(''); setMessage(''); }}>Remove</Button></li>)}</ul>}
    {loaded && keys.length === 0 && <p className="text-sm">No passkeys registered yet.</p>}
    {passkeysSupported() ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); void (removing ? remove() : register()); }}>
      {removing ? <p className="text-sm">Remove <strong>{removing.label}</strong>? It will no longer grant admin access. Confirm with your administrator password.</p> : <Field id="passkey-label" label="Passkey name" value={label} required maxLength={80} disabled={busy} onChange={e => setLabel(e.target.value)} />}
      <Field id="passkey-confirm-password" label="Confirm administrator password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} />
      <div className="flex gap-2"><Button disabled={busy || !loaded} variant={removing ? 'destructive' : 'default'}><Fingerprint className="w-4 h-4 mr-2" />{busy ? 'Please wait…' : removing ? 'Confirm removal' : 'Register passkey'}</Button>{removing && <Button type="button" variant="outline" disabled={busy} onClick={() => { setRemoving(null); setPassword(''); }}>Cancel</Button>}</div>
    </form> : <p className="text-sm">Open this website over HTTPS in a browser that supports passkeys.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    </div>}</section>;
}
