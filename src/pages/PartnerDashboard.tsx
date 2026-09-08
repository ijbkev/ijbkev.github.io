import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Handshake, Landmark } from 'lucide-react';
import { acceptsReimbursements, projects } from '@/data/projects';
import { api, ApiError } from '@/lib/reimbursement-api';
import AccessGate from '@/components/reimbursement/AccessGate';
import { Button } from '@/components/ui/button';
import type { ProjectSettings } from '../../shared/reimbursement';
import NotFound from './NotFound';

export default function PartnerDashboard() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId && acceptsReimbursements(p));
  const client = useQueryClient();
  const session = useQuery({ queryKey: ['organisation-session', projectId], queryFn: () => api<ProjectSettings>(`/projects/${projectId}/organisation-session`), enabled: !!project, retry: false, refetchOnWindowFocus: false });
  const [logoutError, setLogoutError] = useState('');
  async function logout() {
    try { await api(`/projects/${projectId}/organisation-logout`, { method: 'POST', body: '{}' }); client.removeQueries({ queryKey: ['organisation-form', projectId] }); client.removeQueries({ queryKey: ['partner-documents', projectId] }); await client.resetQueries({ queryKey: ['organisation-session', projectId] }); } catch (e) { setLogoutError((e as Error).message); }
  }
  if (!project) return <NotFound />;
  return <div className="page-shell py-10 md:py-16 space-y-8">
    <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to {project.title}</Link>
    <header className="space-y-3"><p className="text-sm uppercase tracking-[0.18em] text-primary">{project.title}</p><h1 className="text-3xl md:text-4xl font-semibold">Partner Dashboard</h1><p className="max-w-2xl text-muted-foreground">Complete your organisation’s reimbursement declaration and partnership agreement.</p></header>
    {session.data && <div className="flex flex-wrap items-center gap-4"><p className="font-semibold">National team: {session.data.country}</p><Button variant="outline" onClick={logout}>Sign out / change country</Button>{logoutError && <p role="alert" className="text-destructive">{logoutError}</p>}</div>}
    {session.isPending ? <p role="status">Checking partner access…</p> : session.isError ? session.error instanceof ApiError && session.error.status === 401 ? <AccessGate audience="organisation" destination="dashboard" projectId={project.id} onUnlocked={() => client.invalidateQueries({ queryKey: ['organisation-session', projectId] })} /> : <div className="rounded-xl border p-6 space-y-4"><p role="alert">{session.error.message}</p><Button variant="outline" onClick={() => session.refetch()}>Try again</Button></div> : <section aria-label="Partner documents" className="grid gap-5 md:grid-cols-2 max-w-4xl">
      <Link to={`/projects/${project.id}/organisation-reimbursement`} className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 space-y-4 transition hover:border-violet-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Landmark className="h-8 w-8 text-violet-700" /><h2 className="text-xl font-semibold">Reimbursement Declaration</h2><p className="text-sm text-muted-foreground">For team leaders and sending organisations after participant reimbursements are finalized.</p><span className="inline-flex items-center gap-2 text-sm font-semibold text-violet-800">Open declaration<ArrowRight className="h-4 w-4" /></span></Link>
      <Link to={`/projects/${project.id}/partnership-agreement`} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-4 transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Handshake className="h-8 w-8 text-emerald-700" /><h2 className="text-xl font-semibold">Partnership Agreement</h2><p className="text-sm text-muted-foreground">Review, complete and sign the project partnership agreement.</p><span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">Open agreement<ArrowRight className="h-4 w-4" /></span></Link>
    </section>}
    {session.isSuccess && <PartnerDocuments key={session.data.country} projectId={project.id} country={session.data.country!} />}
  </div>;
}

function PartnerDocuments({ projectId, country }: { projectId: string; country: string }) {
  type Doc = { id: string; name: string; createdAt: string };
  const query = useQuery({ queryKey: ['partner-documents', projectId, country], queryFn: () => api<{ country: string; declarations: Doc[]; agreements: Doc[] }>(`/projects/${projectId}/partner-documents`) });
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  async function download(id: string, kind: string) {
    setBusy(id); setError('');
    try { const response = await fetch(`/api/projects/${projectId}/${kind}/${id}/pdf`, { credentials: 'same-origin' }); if (!response.ok) throw new Error((await response.json()).error || 'Unable to download this document.'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `${kind}-${country}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  return <section className="rounded-2xl border p-6 space-y-4"><h2 className="text-xl font-semibold">{country} — submitted documents</h2>{query.isPending ? <p>Loading your documents…</p> : query.isError ? <p role="alert" className="text-destructive">{query.error.message}</p> : <>{[...query.data.declarations.map(d => ({ ...d, kind: 'organisation-declarations', label: 'Reimbursement declaration' })), ...query.data.agreements.map(d => ({ ...d, kind: 'partnership-agreements', label: 'Partnership agreement' }))].map(d => <div key={d.id} className="flex flex-wrap justify-between gap-3 border-b py-3"><div><p className="font-medium">{d.label} — {d.name}</p><p className="text-sm text-muted-foreground">Submitted {new Date(d.createdAt).toLocaleDateString()}</p></div><Button variant="outline" disabled={busy === d.id} onClick={() => download(d.id, d.kind)}>{busy === d.id ? 'Downloading…' : 'Download PDF'}</Button></div>)}{!query.data.declarations.length && !query.data.agreements.length && <p className="text-muted-foreground">Your country has not submitted any documents yet.</p>}</>}{error && <p role="alert" className="text-destructive">{error}</p>}</section>;
}
