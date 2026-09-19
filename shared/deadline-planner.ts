export type PlannerTask = {
  id: string; title: string; deadline: string; important: boolean;
  urgency: 'auto' | 'urgent' | 'not-urgent'; notes: string; completed: boolean;
};
export function daysUntil(deadline: string, now = new Date()) {
  const [year, month, day] = deadline.split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
export function quadrant(task: PlannerTask, window: number, now = new Date()) {
  const urgent = task.urgency === 'urgent' || (task.urgency === 'auto' && daysUntil(task.deadline, now) <= window);
  return task.important ? (urgent ? 0 : 1) : (urgent ? 2 : 3);
}
export function deadlineLabel(deadline: string, now = new Date()) {
  const days = daysUntil(deadline, now);
  return days < 0 ? `${Math.abs(days)} ${days === -1 ? 'day' : 'days'} overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days left`;
}
