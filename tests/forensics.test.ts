import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/lib/forensics/engine.js';
import { scanStatus, type ScanResult, type TicketReport } from '../src/lib/forensics/types';
const engine = (globalThis as unknown as { PdfTicketForensics: { analyzePdf(input: Uint8Array, options?: object): Promise<ScanResult> } }).PdfTicketForensics;
function ticketPdf(producer: string) {
  let text = '%PDF-1.4\n'; const offsets = [0];
  const content = 'BT /F1 12 Tf 50 700 Td (Ticket Berlin to Vienna - EUR 349.00) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Creator (Carrier Ticketing) /Producer (${producer}) /CreationDate (D:20260904120000Z) /ModDate (D:20260904120000Z) >>`];
  objects.forEach((body, i) => { offsets.push(text.length); text += `${i+1} 0 obj\n${body}\nendobj\n`; });
  const xref=text.length; text += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n` + offsets.slice(1).map(o => `${String(o).padStart(10,'0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(text);
}
test('supplied forensic engine detects editor provenance and accepts a low-indicator fixture', async () => {
  const clean = await engine.analyzePdf(ticketPdf('Carrier Ticket Generator'), { claimAmount: 349 });
  assert.ok(clean.score <= 20, JSON.stringify(clean));
  const edited = await engine.analyzePdf(ticketPdf('Sejda SAMBox'), { claimAmount: 349 });
  assert.ok(edited.score > 20); assert.ok(edited.findings.some(f => f.title.includes('provenance')));
  await assert.rejects(engine.analyzePdf(new Uint8Array([1,2,3])), /PDF/);
});
test('download review warns only above 20 and never labels failed scans as clear', () => {
  const report = (score: number) => ({ result: { score, findings: [] } }) as TicketReport;
  assert.equal(scanStatus([report(20)]), 'clear'); assert.equal(scanStatus([report(21)]), 'warning');
  assert.equal(scanStatus([report(0), report(80)]), 'warning');
  assert.equal(scanStatus([{ error: 'Timed out' } as TicketReport]), 'incomplete');
  assert.equal(scanStatus([], 'Service unavailable'), 'incomplete'); assert.equal(scanStatus([]), 'no-pdfs');
});
