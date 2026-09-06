import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, downloadClaim } from '@/lib/reimbursement-api';
import { scanTicket } from '@/lib/forensics/scan';
import { scanStatus, type TicketManifest, type TicketReport } from '@/lib/forensics/types';

function shortIssue(title: string) {
  if (/amounts changed/i.test(title)) return 'Price amounts differ between saved versions.';
  if (/claimed amount/i.test(title)) return 'Claimed price could not be confirmed.';
  if (/provenance.*newly written revision|revision chain|rewrite|regenerat/i.test(title)) return 'PDF was rewritten or exported again.';
  if (/editor|post-processing provenance/i.test(title)) return 'PDF editing software detected.';
  if (/timestamps differ|modification timestamp|timestamp predates/i.test(title)) return 'Creation and modification dates differ.';
  if (/metadata disagree|provenance values/i.test(title)) return 'Conflicting document metadata.';
  if (/revision/i.test(title)) return 'Multiple saved versions detected.';
  if (/AcroForm/i.test(title)) return 'Unusual PDF form structure.';
  if (/signature/i.test(title)) return 'PDF signature structure needs review.';
  if (/overlay|inserted|replacement/i.test(title)) return 'Possible added or replaced content.';
  return title;
}

export default function PdfDownloadReview({ id, onClose }: { id: string; onClose(): void }) {
  const [manifest, setManifest] = useState<TicketManifest>();
  const [reports, setReports] = useState<TicketReport[]>([]);
  const [scanning, setScanning] = useState(true);
  const [failure, setFailure] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const controller = useRef<AbortController>();
  useEffect(() => {
    let active = true;
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 180000);
    void (async () => {
      try {
        const data = await api<TicketManifest>(`/admin/submissions/${id}/pdf-tickets`, { signal: abort.signal });
        if (abort.signal.aborted) return;
        setManifest(data);
        for (const ticket of data.tickets) {
          if (abort.signal.aborted) throw new Error('The scan was not completed.');
          const report = await scanTicket(ticket, abort.signal);
          if (abort.signal.aborted) throw new Error('The scan was not completed.');
          setReports(previous => [...previous, report]);
        }
      } catch (e) { if (active) setFailure(abort.signal.aborted ? 'The scan was interrupted or timed out. You can still download the PDF.' : (e as Error).message); }
      finally { clearTimeout(timeout); if (active) setScanning(false); }
    })();
    return () => { active = false; clearTimeout(timeout); abort.abort(); };
  }, [id]);
  const status = scanStatus(reports, failure);
  async function download() {
    controller.current?.abort(); setScanning(false); setDownloading(true); setDownloadError('');
    try { await downloadClaim(id); onClose(); } catch (e) { setDownloadError((e as Error).message); } finally { setDownloading(false); }
  }
  const title = scanning ? 'Scanning PDF tickets' : status === 'warning' ? 'Issue with PDF detected' : status === 'incomplete' ? 'PDF scan incomplete' : status === 'no-pdfs' ? 'No PDF tickets to scan' : 'No significant PDF tampering indicators detected';
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{manifest?.participant ?? 'Participant ticket review'}. Original PDF attachments are checked; images are not scanned. Indicators are not proof of tampering or authenticity.</DialogDescription></DialogHeader>
    {scanning && <p role="status">Checking {reports.length} of {manifest?.tickets.length ?? '…'} PDF tickets…</p>}
    {failure && <p role="alert" className="text-amber-800">{failure}</p>}
    {reports.map(ticket => {
      const flagged = (ticket.result?.score ?? 0) > 20;
      const issues = [...new Set(ticket.result?.findings.filter(f => f.points > 0).sort((a, b) => b.points - a.points).map(f => shortIssue(f.title)) ?? [])].slice(0, 3);
      return <article key={ticket.serial} className={`rounded-lg border p-4 space-y-2 ${flagged ? 'border-red-600 bg-red-50' : ''}`}>
        <h3 className="font-semibold break-words">Ticket {ticket.serial}: {ticket.filename}</h3>
        <p className="text-sm">{ticket.from} → {ticket.to}</p>
        {ticket.error ? <p className="text-sm text-amber-800">Not scanned: {ticket.error}</p> : <>
          <p className={`font-semibold ${flagged ? 'text-red-700' : 'text-green-800'}`}>{flagged ? 'Issue with PDF detected' : 'No significant PDF tampering indicators detected'}</p>
          <p className="text-sm">Forensic score: {ticket.result?.score}/100</p>
          {flagged && <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
          {ticket.currency !== 'EUR' && <p className="text-xs text-muted-foreground">Structural checks only; {ticket.currency} amount not compared.</p>}
        </>}
      </article>;
    })}
    {manifest && <p className="text-sm text-muted-foreground">{manifest.skippedImages} image attachment(s) excluded.</p>}
    <Button onClick={download} disabled={downloading}>{downloading ? 'Downloading…' : scanning ? 'Skip remaining scan and download' : status === 'warning' || status === 'incomplete' ? 'Download anyway' : 'Download PDF'}</Button>
    {downloadError && <p role="alert" className="text-destructive">{downloadError}</p>}
  </DialogContent></Dialog>;
}
