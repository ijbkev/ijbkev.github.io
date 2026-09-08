import MapHeroAccent from "@/components/MapHeroAccent";
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar, MapPin, ExternalLink, FileCheck2, LockKeyhole, UserRound, Handshake } from 'lucide-react';
import { acceptsReimbursements, projects } from '@/data/projects';
import { api } from '@/lib/reimbursement-api';
import type { ProjectSettings } from '../../shared/reimbursement';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId && acceptsReimbursements(p));
  const settings = useQuery({ queryKey: ['project-settings', projectId], queryFn: () => api<ProjectSettings>(`/projects/${projectId}`), enabled: !!project, retry: 1 });
  if (!project) return <NotFound />;
  return <div className="pb-20">
    <section className="map-page-hero relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white">
        <MapHeroAccent />
      <div className="page-shell relative py-12 md:py-20 space-y-7">
        <Link to="/projects" className="inline-flex items-center text-sm gap-2 text-white/80 hover:text-white"><ArrowLeft className="w-4 h-4" />All projects</Link>
        <div className="flex flex-wrap gap-3 text-xs font-semibold"><span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full">{project.status}</span><span className="border border-white/30 px-3 py-1 rounded-full">{project.category}</span></div>
        <h1 className="text-4xl md:text-6xl font-semibold">{project.title}</h1>
        <div className="flex flex-wrap gap-6 text-white/80"><span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{project.date}</span><span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{project.location}</span></div>
      </div>
    </section>
    <div className="page-shell grid lg:grid-cols-[1.4fr_1fr] gap-10 py-12 items-start">
      <div className="space-y-8">
        <section className="space-y-4"><h2 className="text-2xl font-semibold">About the project</h2><p className="text-muted-foreground leading-relaxed text-lg">{project.description}</p><div className="flex flex-wrap gap-2">{project.highlights.map(h => <span key={h} className="rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm">{h}</span>)}</div></section>
        <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-xl font-semibold">Participating countries</h2>
          {settings.isPending ? <p className="text-muted-foreground">Loading participating countries…</p> : settings.isError ? <p className="text-sm text-muted-foreground">Participating countries are temporarily unavailable. <button className="underline" onClick={() => settings.refetch()}>Retry</button></p> : settings.data.countries.length ? <div className="flex flex-wrap gap-2">{settings.data.countries.map(country => <span key={country} className="rounded-lg bg-muted px-3 py-2 text-sm">{country}</span>)}</div> : <p className="text-muted-foreground">The organizer will publish the participating countries here before reimbursement opens.</p>}
          {settings.data?.projectCode && <p className="text-sm text-muted-foreground">Project code: <span className="text-foreground">{settings.data.projectCode}</span></p>}
        </section>
        {project.applicationLink && <Button asChild variant="outline"><a href={project.applicationLink} target="_blank" rel="noopener noreferrer">{project.applicationLabel ?? 'Apply now'}<ExternalLink className="w-4 h-4 ml-2" /></a></Button>}
      </div>
      <aside className="rounded-3xl border bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-start gap-4"><span className="rounded-2xl bg-primary/10 p-3"><FileCheck2 className="w-7 h-7 text-primary" /></span><div><h2 className="text-2xl font-semibold">Participant and Partner Toolkit</h2><p className="mt-1 text-sm text-muted-foreground">Choose the document or portal that matches your role.</p></div></div>
        {settings.data?.enabled ? <div className="space-y-3"><ToolkitLink to={`/projects/${project.id}/reimbursement`} icon={UserRound} title="Participant Dashboard" description="Open participant reimbursement tools and submit your travel costs, tickets, bank details and signature." tone="blue" /><ToolkitLink to={`/projects/${project.id}/partner-dashboard`} icon={Handshake} title="Partner Dashboard" description="Complete your reimbursement declaration and partnership agreement." tone="violet" /></div> : <p className="rounded-lg bg-muted p-3 text-sm">{settings.isError ? 'The toolkit is temporarily unavailable.' : 'The toolkit will open when the organizer has configured this project.'}</p>}
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="w-4 h-4 shrink-0" />You’ll need the secret access code from your project organizer.</p>
      </aside>
    </div>
  </div>;
}

function ToolkitLink({ to, icon: Icon, title, description, tone }: { to: string; icon: typeof UserRound; title: string; description: string; tone: 'blue' | 'violet' | 'emerald' }) {
  const tones = { blue: 'border-blue-200 bg-blue-50/60 hover:border-blue-400 hover:bg-blue-50 text-blue-800', violet: 'border-violet-200 bg-violet-50/60 hover:border-violet-400 hover:bg-violet-50 text-violet-800', emerald: 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-800' };
  return <Link to={to} className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${tones[tone]}`}><span className="rounded-xl bg-white/80 p-2.5 shadow-sm"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span></span><ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></Link>;
}
