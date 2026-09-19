import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FileSpreadsheet, Mail, Plus, Save, Search, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/reimbursement-api';
import { Button } from '@/components/ui/button';
import { SelectField } from './Field';

type Sheet = { columns: string[]; rows: string[][]; updatedAt: string | null };
const GMAIL_SENDER = 'office@ijbk-de.org';

function uniqueHeaders(values: unknown[], width: number) {
  const used = new Set<string>();
  return Array.from({ length: width }, (_, index) => {
    const base = String(values[index] ?? '').trim() || `Column ${index + 1}`;
    let name = base; let suffix = 2;
    while (used.has(name)) name = `${base} (${suffix++})`;
    used.add(name); return name;
  });
}

const normalizedHeader = (value: string) => value.trim().toLocaleLowerCase();

function rowIdentity(row: string[], emailIndex: number) {
  const email = emailIndex >= 0 ? (row[emailIndex] ?? '').trim().toLocaleLowerCase() : '';
  return email ? `email:${email}` : `row:${JSON.stringify(row.map(value => value.trim().toLocaleLowerCase()))}`;
}

function GrowingCell({ label, value, onChange }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = '0px';
    ref.current.style.height = `${Math.max(96, ref.current.scrollHeight)}px`;
  };
  useLayoutEffect(resize, [value]);
  return <textarea ref={ref} aria-label={label} rows={4} wrap="soft" className="block min-h-24 w-full min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words rounded border border-transparent bg-transparent px-2 py-2 leading-5 focus:border-input focus:bg-background" value={value} onInput={resize} onChange={onChange} />;
}

export default function ProjectParticipantsAdmin({ projectId, projectTitle }: { projectId: string; projectTitle: string; countries: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const query = useQuery({ queryKey: ['admin-participant-sheet', projectId], queryFn: () => api<Sheet>(`/admin/projects/${projectId}/participant-sheet`), retry: false });
  const [columns, setColumns] = useState<string[] | null>(null); const [rows, setRows] = useState<string[][] | null>(null);
  const activeColumns = useMemo(() => columns ?? query.data?.columns ?? [], [columns, query.data?.columns]);
  const activeRows = useMemo(() => rows ?? query.data?.rows ?? [], [rows, query.data?.rows]);
  const [search, setSearch] = useState(''); const [selected, setSelected] = useState<Set<number>>(new Set()); const [emailColumn, setEmailColumn] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const activeEmailColumn = emailColumn && activeColumns.includes(emailColumn) ? emailColumn : activeColumns.find(column => /e-?mail/i.test(column)) ?? '';
  const visible = useMemo(() => activeRows.map((row, index) => ({ row, index })).filter(({ row }) => row.join(' ').toLowerCase().includes(search.toLowerCase())), [activeRows, search]);
  const dirty = columns !== null || rows !== null;

  async function readFile(file?: File) {
    if (!file) return; setError(''); setMessage('');
    try {
      const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]]; const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
      if (!matrix.length) throw new Error('The first worksheet is empty.');
      const width = Math.max(...matrix.map(row => row.length)); if (!width) throw new Error('No columns were found in the first worksheet.');
      const uploadedColumns = uniqueHeaders(matrix[0], width);
      const uploadedRows = matrix.slice(1).map(row => Array.from({ length: width }, (_, index) => String(row[index] ?? '').trim()));
      const targetColumns = activeColumns.length ? activeColumns : uploadedColumns;
      const uploadedIndex = new Map(uploadedColumns.map((column, index) => [normalizedHeader(column), index]));
      const matchedColumns = targetColumns.filter(column => uploadedIndex.has(normalizedHeader(column)));
      if (activeColumns.length && !matchedColumns.length) throw new Error('None of the uploaded columns match the existing table columns.');
      const mappedRows = uploadedRows.map(row => targetColumns.map(column => {
        const index = uploadedIndex.get(normalizedHeader(column));
        return index === undefined ? '' : row[index] ?? '';
      })).filter(row => row.some(Boolean));
      const detectedEmailColumn = emailColumn && targetColumns.includes(emailColumn) ? emailColumn : targetColumns.find(column => /e-?mail/i.test(column)) ?? '';
      const emailIndex = targetColumns.indexOf(detectedEmailColumn);
      const identities = new Set(activeRows.map(row => rowIdentity(row, emailIndex)));
      const newRows = mappedRows.filter(row => { const identity = rowIdentity(row, emailIndex); if (identities.has(identity)) return false; identities.add(identity); return true; });
      const ignoredColumns = activeColumns.length ? uploadedColumns.length - matchedColumns.length : 0;
      const skippedRows = mappedRows.length - newRows.length;
      setColumns([...targetColumns]); setRows([...activeRows, ...newRows]); setSelected(new Set()); setEmailColumn(detectedEmailColumn);
      setMessage(`${newRows.length} new row(s) added from ${file.name}.${skippedRows ? ` ${skippedRows} existing or duplicate row(s) skipped.` : ''}${ignoredColumns ? ` ${ignoredColumns} unknown or deleted column(s) ignored.` : ''} Review the changes, then save the table.`);
    } catch (reason) { setError((reason as Error).message || 'The spreadsheet could not be read.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }
  function changeCell(rowIndex: number, columnIndex: number, value: string) { setRows(activeRows.map((row, index) => index === rowIndex ? row.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell) : [...row])); if (columns === null) setColumns([...activeColumns]); }
  function deleteRow(index: number) {
    const nextRows = activeRows.filter((_, rowIndex) => rowIndex !== index);
    setColumns([...activeColumns]); setRows(nextRows); setSelected(new Set()); setError('');
    setMessage(`Row ${index + 1} deleted. Click Save table to keep this change.`);
  }
  function deleteColumn(index: number) {
    const removed = activeColumns[index];
    if (!window.confirm(`Delete the “${removed}” column and all of its values?`)) return;
    const nextColumns = activeColumns.filter((_, columnIndex) => columnIndex !== index);
    const nextRows = activeRows.map(row => row.filter((_, columnIndex) => columnIndex !== index));
    setColumns(nextColumns); setRows(nextRows); setSelected(new Set()); setError('');
    if (emailColumn === removed) setEmailColumn('');
    setMessage(`“${removed}” deleted. Click Save table to keep this change.`);
  }
  function addRow() { setColumns([...activeColumns]); setRows([...activeRows, activeColumns.map(() => '')]); }
  function addColumn() { const proposed = window.prompt('Column name'); const base = proposed?.trim(); if (!base) return; if (activeColumns.includes(base)) { setError('Column names must be unique.'); return; } setColumns([...activeColumns, base]); setRows(activeRows.map(row => [...row, ''])); }
  async function save() { setBusy(true); setError(''); setMessage(''); try { const saved = await api<Sheet>(`/admin/projects/${projectId}/participant-sheet`, { method: 'PUT', body: JSON.stringify({ columns: activeColumns, rows: activeRows }) }); setColumns(null); setRows(null); await query.refetch(); setMessage(`Saved ${saved.rows.length} row(s) and ${saved.columns.length} column(s).`); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }
  async function deleteTable() {
    if (!window.confirm('Delete the complete participant table, including every column and row? This cannot be undone.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api<Sheet>(`/admin/projects/${projectId}/participant-sheet`, { method: 'PUT', body: JSON.stringify({ columns: [], rows: [] }) });
      setColumns(null); setRows(null); setSelected(new Set()); setEmailColumn('');
      await query.refetch(); setMessage('The complete participant table was deleted.');
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  function toggleAll() { setSelected(current => visible.every(item => current.has(item.index)) ? new Set([...current].filter(index => !visible.some(item => item.index === index))) : new Set([...current, ...visible.map(item => item.index)])); }
  function moveTable(left: number, top: number) {
    document.querySelector<HTMLElement>('.participant-sheet .overflow-y-scroll')?.scrollBy({ left, top, behavior: 'smooth' });
  }
  function openGmail() { setError(''); if (!selected.size) { setError('Select at least one participant row to email.'); return; } const columnIndex = activeColumns.indexOf(activeEmailColumn); if (columnIndex < 0) { setError('Choose the column containing email addresses.'); return; } const emails = [...new Set(activeRows.filter((_, index) => selected.has(index)).map(row => row[columnIndex]?.trim()).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))]; if (!emails.length) { setError('The selected rows do not contain valid email addresses.'); return; } const params = new URLSearchParams({ view: 'cm', fs: '1', authuser: GMAIL_SENDER, bcc: emails.join(','), su: projectTitle }); window.open(`https://mail.google.com/mail/u/${encodeURIComponent(GMAIL_SENDER)}/?${params}`, '_blank', 'noopener,noreferrer'); }

  if (query.isPending) return <p role="status">Loading participant table…</p>;
  if (query.isError) return <p role="alert" className="text-destructive">{query.error.message}</p>;
  return <section className="participant-sheet space-y-6">
    <div className="rounded-2xl border bg-white p-5 shadow-sm md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold tracking-tight">Project participants</h2><p className="mt-1 text-sm text-muted-foreground">Upload, edit and contact everyone from one table.</p></div></div><div className="flex flex-wrap gap-2"><input ref={fileRef} className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={event => readFile(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Upload file</Button><Button type="button" onClick={save} disabled={busy || !dirty}><Save className="mr-2 h-4 w-4" />{busy ? 'Saving…' : 'Save changes'}</Button><Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteTable} disabled={busy || !activeColumns.length}><Trash2 className="mr-2 h-4 w-4" />Delete table</Button></div></div>
      <p className="text-xs text-muted-foreground">Later files are matched by column name. Unknown or deleted columns are ignored, and existing participants are skipped by email (or by their complete row when no email column exists).</p>
      {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-destructive">{error}</p>}
    </div>
    <div className="rounded-2xl border bg-card overflow-hidden">
      {!!activeColumns.length && <nav aria-label="Table navigation" className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2"><span className="mr-1 text-xs font-medium text-muted-foreground">Move table</span><Button type="button" size="sm" variant="outline" onClick={() => moveTable(-640, 0)} aria-label="Scroll table left"><ArrowLeft className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" onClick={() => moveTable(640, 0)} aria-label="Scroll table right"><ArrowRight className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" onClick={() => moveTable(0, -520)} aria-label="Scroll table up"><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" onClick={() => moveTable(0, 520)} aria-label="Scroll table down"><ArrowDown className="h-4 w-4" /></Button><span className="ml-1 text-xs text-muted-foreground">Swipe, use Shift + mouse wheel, or use these controls.</span></nav>}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4"><div className="relative min-w-64 flex-1 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm" placeholder="Search every column" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="flex flex-wrap items-end gap-2"><div className="w-52"><SelectField id="participant-email-column" label="Email address column" value={activeEmailColumn} onChange={event => setEmailColumn(event.target.value)}><option value="">Choose column</option>{activeColumns.map(column => <option key={column}>{column}</option>)}</SelectField></div><Button type="button" variant="outline" onClick={openGmail}><Mail className="mr-2 h-4 w-4" />Email {selected.size || ''} in Gmail</Button><Button type="button" variant="outline" onClick={addColumn}><Plus className="mr-2 h-4 w-4" />Column</Button><Button type="button" variant="outline" onClick={addRow} disabled={!activeColumns.length}><Plus className="mr-2 h-4 w-4" />Row</Button></div></div>
      {!activeColumns.length ? <div className="p-12 text-center"><FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">Upload a spreadsheet to create the table</p><p className="text-sm text-muted-foreground">CSV, XLS and XLSX files are accepted.</p></div> : <div className="max-h-[65vh] overflow-x-auto overflow-y-scroll overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"><table className="min-w-full border-collapse text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-12 border-b border-r p-3"><input type="checkbox" aria-label="Select visible rows" checked={visible.length > 0 && visible.every(item => selected.has(item.index))} onChange={toggleAll} /></th><th className="w-14 border-b border-r p-3 text-muted-foreground">#</th>{activeColumns.map((column, index) => <th key={`${column}-${index}`} className="min-w-56 max-w-96 border-b border-r p-2 text-left"><div className="flex items-start justify-between gap-2"><span className="block whitespace-normal break-words">{column}</span><Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Delete ${column} column`} onClick={() => deleteColumn(index)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></th>)}<th className="w-16 border-b p-3">Row</th></tr></thead><tbody>{visible.map(({ row, index }) => <tr key={index} className="border-b align-top"><td className="border-r p-3 text-center"><input type="checkbox" aria-label={`Select row ${index + 1}`} checked={selected.has(index)} onChange={() => setSelected(old => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /></td><td className="border-r p-3 text-center text-muted-foreground">{index + 1}</td>{activeColumns.map((column, columnIndex) => <td key={`${column}-${columnIndex}`} className="max-w-96 border-r p-1"><GrowingCell label={`${column}, row ${index + 1}`} value={row[columnIndex] ?? ''} onChange={event => changeCell(index, columnIndex, event.target.value)} /></td>)}<td className="p-2 text-center"><Button type="button" size="icon" variant="ghost" aria-label={`Delete row ${index + 1}`} onClick={() => deleteRow(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>)}</tbody></table>{!visible.length && activeRows.length > 0 && <p className="p-8 text-center text-muted-foreground">No rows match your search.</p>}{!activeRows.length && <p className="p-8 text-center text-muted-foreground">The table has columns but no data rows. Add a row to enter data manually.</p>}</div>}
      <div className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">{activeRows.length} row(s) · {activeColumns.length} column(s){dirty ? ' · Unsaved changes' : query.data?.updatedAt ? ` · Saved ${new Date(query.data.updatedAt).toLocaleString()}` : ''}</div>
    </div>
  </section>;
}
