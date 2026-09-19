import { PasskeySignIn } from '@/components/admin/AdminPasskeys';
import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, LogOut, Plus, CalendarDays, Check, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, SelectField } from '@/components/reimbursement/Field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ApiError, api } from '@/lib/reimbursement-api';
import { daysUntil, deadlineLabel, quadrant, type PlannerTask } from '../../shared/deadline-planner';

type Board = { tasks: PlannerTask[]; urgencyDays: number };
const sections = [
  { title: 'Do first', subtitle: 'Important & urgent', hint: 'Your next meaningful action starts here.', color: 'border-rose-200 bg-rose-50/70', badge: 'bg-rose-100 text-rose-800' },
  { title: 'Schedule', subtitle: 'Important · not urgent', hint: 'Protect time for the things that matter.', color: 'border-blue-200 bg-blue-50/70', badge: 'bg-blue-100 text-blue-800' },
  { title: 'Delegate', subtitle: 'Less important & urgent', hint: 'Consider who could help with these tasks.', color: 'border-amber-200 bg-amber-50/70', badge: 'bg-amber-100 text-amber-800' },
  { title: 'Reconsider', subtitle: 'Less important · not urgent', hint: 'Postpone or remove what can wait.', color: 'border-slate-200 bg-slate-50/70', badge: 'bg-slate-200 text-slate-700' },
];

export default function DeadlinePlanner() {
  const [access, setAccess] = useState<'checking' | 'locked' | 'open'>('checking');
  const [board, setBoard] = useState<Board | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PlannerTask | null>(null);
  const [deleting, setDeleting] = useState<PlannerTask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      setAccess('locked'); setBoard(null); setEditing(null); setDeleting(null);
    }
    setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
  }
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const data = await api<Board>('/admin/planner');
        if (active) { setBoard(data); setAccess('open'); setNow(new Date()); }
      } catch (e) {
        if (active) {
          if (e instanceof ApiError && e.status === 401) { setAccess('locked'); setBoard(null); setEditing(null); setDeleting(null); }
          else { setError((e as Error).message); setAccess(previous => previous === 'checking' ? 'locked' : previous); }
        }
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setBoard(await api<Board>('/admin/planner')); setAccess('open');
    } catch (e) { handleError(e); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api('/admin/logout', { method: 'POST' }); setBoard(null); setAccess('locked'); setEditing(null); setDeleting(null); }
    catch (e) { handleError(e); } finally { setBusy(false); }
  }
  async function saveTask(task: PlannerTask) {
    setBusy(true); setError('');
    try {
      const saved = await api<PlannerTask>(`/admin/planner/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(task) });
      setBoard(previous => previous && { ...previous, tasks: [...previous.tasks.filter(t => t.id !== saved.id), saved] });
      setEditing(null);
    } catch (e) { handleError(e); } finally { setBusy(false); }
  }
  async function deleteTask() {
    if (!deleting) return;
    setBusy(true); setError('');
    try {
      await api(`/admin/planner/tasks/${deleting.id}`, { method: 'DELETE' });
      setBoard(previous => previous && { ...previous, tasks: previous.tasks.filter(t => t.id !== deleting.id) }); setDeleting(null);
    } catch (e) { handleError(e); } finally { setBusy(false); }
  }
  async function changeWindow(urgencyDays: number) {
    setBusy(true); setError('');
    try {
      await api('/admin/planner/settings', { method: 'PUT', body: JSON.stringify({ urgencyDays }) });
      setBoard(previous => previous && { ...previous, urgencyDays });
    } catch (e) { handleError(e); } finally { setBusy(false); }
  }
  const tasks = board?.tasks ?? [];
  const activeTasks = tasks.filter(t => !t.completed);
  const sorted = [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title));
  function moveTask(task: PlannerTask, index: number) {
    if (busy || index < 0 || index > 3) return;
    void saveTask({ ...task, important: index < 2, urgency: index % 2 === 0 ? 'urgent' : 'not-urgent' });
  }
  function card(task: PlannerTask) {
    return <article key={task.id} draggable={!busy && !task.completed} onDragStart={event => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; setDraggedId(task.id); }} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm space-y-3 text-slate-900">
      <div className="flex items-start justify-between gap-3"><h3 className={`font-semibold break-words min-w-0 ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.title}</h3><button disabled={busy} onClick={() => saveTask({ ...task, completed: !task.completed })} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} className={`shrink-0 rounded-full border p-1.5 ${task.completed ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-slate-100'}`}><Check size={16} /></button></div>
      <p className={`text-xs font-semibold flex items-center gap-2 ${!task.completed && daysUntil(task.deadline, now) < 0 ? 'text-rose-700' : 'text-slate-600'}`}><CalendarDays size={14} />{task.completed ? 'Completed' : deadlineLabel(task.deadline, now)}<span className="font-normal">· {task.deadline}</span></p>
      {!task.completed && <select aria-label={`Move ${task.title} to category`} className="w-full rounded border bg-white p-2 text-xs" disabled={busy} value={quadrant(task, board!.urgencyDays, now)} onChange={event => moveTask(task, Number(event.target.value))}>{sections.map((section, index) => <option key={section.title} value={index}>{section.title}</option>)}</select>}
      {task.notes && <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{task.notes}</p>}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{task.urgency === 'auto' ? 'Urgency follows deadline' : task.urgency === 'urgent' ? 'Marked urgent' : 'Marked not urgent'}</span><div className="flex gap-1"><button disabled={busy} className="p-2 rounded hover:bg-slate-100" onClick={() => { setError(''); setEditing(task); }} aria-label={`Edit ${task.title}`}><Pencil size={15} /></button><button disabled={busy} className="p-2 rounded hover:bg-rose-50 text-rose-700" onClick={() => { setError(''); setDeleting(task); }} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button></div></div>
    </article>;
  }
  return <div className="page-shell py-10 md:py-16 space-y-8">
    <a href="/project-materials/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft size={16} />Project Materials</a>
    <header className="flex flex-wrap justify-between items-start gap-5"><div className="space-y-3"><p className="text-xs uppercase tracking-[.2em] text-primary flex items-center gap-2"><ShieldCheck size={16} />Private admin workspace</p><h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Make time for what matters.</h1><p className="text-muted-foreground">Deadline & Priority Planner · Your tasks, organized with the Eisenhower Matrix.</p></div>{access === 'open' && <Button variant="outline" disabled={busy} onClick={logout}><LogOut size={16} className="mr-2" />Sign out</Button>}</header>
    {error && !editing && !deleting && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-destructive">{error}</p>}
    {access === 'checking' && <p role="status">Checking administrator access…</p>}
    {access === 'locked' && <form onSubmit={login} className="max-w-md rounded-2xl border bg-card p-8 space-y-5"><ShieldCheck className="text-primary" size={32} /><h2 className="text-2xl font-semibold">Administrator sign-in</h2><p className="text-sm text-muted-foreground">Use the same password as the main website’s admin console.</p><Field id="planner-password" label="Administrator password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><Button disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Unlock planner'}</Button><PasskeySignIn disabled={busy} onSuccess={async () => { setPassword(''); setError(''); setBoard(await api<Board>('/admin/planner')); setAccess('open'); }} /></form>}
    {access === 'open' && board && <>
      <div className="grid grid-cols-3 gap-3">{[['Open tasks', activeTasks.length], ['Due today', activeTasks.filter(t => daysUntil(t.deadline, now) === 0).length], ['Overdue', activeTasks.filter(t => daysUntil(t.deadline, now) < 0).length]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-card p-4 md:p-6"><p className="text-2xl md:text-3xl font-semibold">{value}</p><p className="text-xs md:text-sm text-muted-foreground mt-1">{label}</p></div>)}</div>
      <div className="flex flex-wrap justify-between items-end gap-4"><div className="max-w-xs"><SelectField id="urgency-window" label="Automatically urgent when due" disabled={busy} value={board.urgencyDays} onChange={e => changeWindow(Number(e.target.value))}>{Array.from({ length: 31 }, (_, n) => <option key={n} value={n}>{n === 0 ? 'Today or overdue' : `Within ${n} ${n === 1 ? 'day' : 'days'}`}</option>)}</SelectField></div><Button disabled={busy} onClick={() => { setError(''); setEditing({ id: crypto.randomUUID(), title: '', deadline: '', important: true, urgency: 'auto', notes: '', completed: false }); }}><Plus size={18} className="mr-2" />Add task</Button></div>
      <div className="grid md:grid-cols-2 gap-5">{sections.map((section, index) => {
        const items = sorted.filter(t => !t.completed && quadrant(t, board.urgencyDays, now) === index);
        return <section key={section.title} onDragOver={event => { if (draggedId && !busy) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(index); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null); }} onDrop={event => { event.preventDefault(); const task = tasks.find(item => item.id === event.dataTransfer.getData('text/plain') && item.id === draggedId); setDraggedId(null); setDropTarget(null); if (task) moveTask(task, index); }} className={`rounded-2xl border p-5 md:p-6 min-h-64 ${section.color} ${dropTarget === index ? 'ring-2 ring-primary' : ''}`}><header className="flex justify-between items-start mb-5 text-slate-900"><div><p className="text-xs uppercase tracking-wider text-slate-500 mb-1">{section.subtitle}</p><h2 className="text-xl font-semibold">{section.title}</h2></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${section.badge}`}>{items.length}</span></header><div className="space-y-3">{items.map(card)}{!items.length && <p className="py-8 text-sm text-slate-500 text-center">{section.hint}</p>}</div></section>;
      })}</div>
      <div className="space-y-4"><Button variant="outline" onClick={() => setShowCompleted(!showCompleted)} aria-expanded={showCompleted}>{showCompleted ? 'Hide' : 'Show'} completed ({tasks.filter(t => t.completed).length})</Button>{showCompleted && <div className="grid md:grid-cols-2 gap-4">{sorted.filter(t => t.completed).map(card)}</div>}</div>
      <p className="text-xs text-muted-foreground">Drag a task into any of the four categories, or use its category dropdown. Moving a task sets its importance and urgency without changing its deadline. Tasks are saved privately for website administrators. Importance is your choice; automatic urgency follows deadlines in your current time zone.</p>
    </>}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) { setEditing(null); setError(''); } }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{tasks.some(t => t.id === editing?.id) ? 'Edit task' : 'Add a task'}</DialogTitle><DialogDescription>Set a deadline and choose what matters. We’ll find the right quadrant.</DialogDescription></DialogHeader>{editing && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void saveTask(editing); }}>
      <Field id="task-title" label="Task name" required maxLength={200} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
      <Field id="task-deadline" label="Deadline" type="date" required max="9999-12-31" min="0001-01-01" value={editing.deadline} onChange={e => setEditing({ ...editing, deadline: e.target.value })} />
      <SelectField id="task-importance" label="Importance" value={editing.important ? 'important' : 'less'} onChange={e => setEditing({ ...editing, important: e.target.value === 'important' })}><option value="important">Important — contributes to my goals</option><option value="less">Less important</option></SelectField>
      <SelectField id="task-urgency" label="Urgency" value={editing.urgency} onChange={e => setEditing({ ...editing, urgency: e.target.value as PlannerTask['urgency'] })}><option value="auto">Automatic — follow the deadline</option><option value="urgent">Always urgent</option><option value="not-urgent">Not urgent — manual override</option></SelectField>
      <div className="space-y-2"><label htmlFor="task-notes" className="text-sm font-medium">Notes (optional)</label><textarea id="task-notes" className="w-full rounded-md border bg-background p-3 text-sm" rows={3} maxLength={5000} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save task'}</Button></div>
    </form>}</DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={open => { if (!open && !busy) { setDeleting(null); setError(''); } }}><DialogContent><DialogHeader><DialogTitle>Delete this task?</DialogTitle><DialogDescription>“{deleting?.title}” will be permanently removed.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep task</Button><Button variant="destructive" disabled={busy} onClick={deleteTask}>{busy ? 'Deleting…' : 'Delete task'}</Button></div></DialogContent></Dialog>
  </div>;
}
