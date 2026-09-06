import type { PdfTicket, ScanResult, TicketReport } from './types';
function inspect(bytes: ArrayBuffer, ticket: PdfTicket, signal: AbortSignal): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Scan cancelled.')); return; }
    const worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), { type: 'module' });
    const finish = (error?: Error, result?: ScanResult) => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); if (error) reject(error); else resolve(result!); };
    const abort = () => finish(new Error('Scan cancelled.'));
    const timer = setTimeout(() => finish(new Error('PDF inspection timed out. Manual review is recommended.')), 20000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : undefined, data.result);
    worker.onerror = () => finish(new Error('The PDF checker could not complete inspection.'));
    worker.postMessage({ bytes, filename: ticket.filename, currency: ticket.currency, amount: ticket.amount, isBoardingPass: ticket.isBoardingPass }, [bytes]);
  });
}
export async function scanTicket(ticket: PdfTicket, signal: AbortSignal): Promise<TicketReport> {
  if (ticket.error) return ticket;
  const controller = new AbortController();
  const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 20000);
  try {
    if (signal.aborted) throw new Error('Scan cancelled.');
    const response = await fetch(ticket.url, { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error('Original PDF could not be retrieved.');
    if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) throw new Error('Attachment is not a PDF; it was not scanned.');
    const bytes = await response.arrayBuffer(); clearTimeout(timer);
    return { ...ticket, result: await inspect(bytes, ticket, signal) };
  } catch (error) { return { ...ticket, error: error instanceof Error ? error.message : 'Scan unavailable.' }; }
  finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
