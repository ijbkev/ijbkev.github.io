import './engine.js';
import type { ScanResult } from './types';
const scope = globalThis as unknown as { PdfTicketForensics: { analyzePdf(bytes: ArrayBuffer, options: object): Promise<ScanResult> }; onmessage: (e: MessageEvent) => void; postMessage(value: unknown): void };
scope.onmessage = async ({ data }) => {
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser does not support PDF stream inspection.');
    const result = await scope.PdfTicketForensics.analyzePdf(data.bytes, { fileName: data.filename, claimAmount: data.currency === 'EUR' && !data.isBoardingPass ? data.amount : null, maxBytes: 10 * 1024 * 1024 });
    if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) throw new Error('The checker did not return a valid score.');
    scope.postMessage({ result: { score: result.score, findings: result.findings } });
  } catch (error) { scope.postMessage({ error: error instanceof Error ? error.message : 'The PDF could not be scanned.' }); }
};
