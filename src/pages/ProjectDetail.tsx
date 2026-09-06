import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar, MapPin, ExternalLink, FileCheck2, LockKeyhole } from 'lucide-react';
import { projects } from '@/data/projects';
import { api } from '@/lib/reimbursement-api';
import type { ProjectSettings } from '../../shared/reimbursement';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId && p.status === 'Upcoming');
  const settings = useQuery({ queryKey: ['project-settings', projectId], queryFn: () => api<ProjectSettings>(`/projects/${projectId}`), enabled: !!project, retry: 1 });
  if (!project) return <NotFound />;
  return <div className="pb-20">
    <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white">
      <div className="page-shell py-12 md:py-20 space-y-7">
        <Link to="/projects" className="inline-flex items-center text-sm gap-2 text-white/80 hover:text-white"><ArrowLeft className="w-4 h-4" />All projects</Link>
        <div className="flex flex-wrap gap-3 text-xs font-semibold"><span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full">Upcoming</span><span className="border border-white/30 px-3 py-1 rounded-full">{project.category}</span></div>
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
      <aside className="rounded-2xl border bg-card p-6 md:p-8 space-y-5 shadow-sm">
        <FileCheck2 className="w-10 h-10 text-primary" /><h2 className="text-2xl font-semibold">Travel reimbursement</h2>
        <p className="text-muted-foreground">Fill in your details, add your journeys and tickets, and sign once. We’ll put everything into one complete PDF for your organizer.</p>
        <ol className="space-y-3 text-sm">{['Your personal and team details', 'Travel costs and ticket uploads', 'Bank details and your signature'].map((s, i) => <li key={s} className="flex gap-3 items-center"><span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">{i + 1}</span>{s}</li>)}</ol>
        {settings.data?.enabled ? <div className="grid grid-cols-2 gap-3"><Button asChild className="w-full h-auto min-h-14 whitespace-normal px-3 py-2 text-xs sm:text-sm leading-tight"><Link className="justify-center text-center" to={`/projects/${project.id}/reimbursement`}><span>Participant Reimbursement Portal</span><ArrowRight className="ml-1.5 w-4 h-4 shrink-0" /></Link></Button><Button asChild className="w-full h-auto min-h-14 whitespace-normal px-3 py-2 leading-tight"><Link className="justify-center text-center" to={`/projects/${project.id}/organisation-reimbursement`}><span className="min-w-0"><span className="block text-xs sm:text-sm">Reimbursement Declaration</span><span className="block text-[10px] opacity-80 mt-0.5">Partner organisations only</span></span><ArrowRight className="ml-1.5 w-4 h-4 shrink-0" /></Link></Button></div> : <p className="rounded-lg bg-muted p-3 text-sm">{settings.isError ? 'Reimbursement is temporarily unavailable.' : 'Reimbursement will open when the organizer has configured this project.'}</p>}
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="w-4 h-4 shrink-0" />You’ll need the secret access code from your project organizer.</p>
      </aside>
    </div>
  </div>;
}
