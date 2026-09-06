export type Finding = { title: string; detail: string; points: number; severity: string };
export type ScanResult = { score: number; findings: Finding[] };
export type PdfTicket = { serial: number; filename: string; from: string; to: string; amount: number; currency: string; url: string; error?: string };
export type TicketReport = PdfTicket & { result?: ScanResult; error?: string };
export type TicketManifest = { participant: string; tickets: PdfTicket[]; skippedImages: number };
export function scanStatus(reports: TicketReport[], failure?: string) {
  if (reports.some(t => t.result && t.result.score > 20)) return 'warning';
  if (failure || reports.some(t => t.error || !t.result)) return 'incomplete';
  return reports.length ? 'clear' : 'no-pdfs';
}
