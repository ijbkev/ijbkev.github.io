import { PDFDocument } from 'pdf-lib';
import { expandPdfObjects } from '../../shared/pdf-compatibility';

/** Render a separate compatibility copy; forensic checks always use the original. */
export async function prepareDocument(bytes: Uint8Array, type: string): Promise<Blob> {
  if (type !== 'application/pdf') {
    const bitmap = await createImageBitmap(new Blob([bytes.slice().buffer], { type }));
    try {
      const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image rendering is unavailable.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image could not be converted.')), 'image/png'));
    } finally { bitmap.close(); }
  }
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  // PDF.js handles compressed objects, repaired xrefs, annotations, and forms.
  // Rendering also preserves visible editor stamps that page-only import can omit.
  const task = pdfjs.getDocument({ data: bytes.slice(),
    cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/' });
  const timeout = setTimeout(() => { void task.destroy(); }, 120000);
  try {
    const source = await task.promise;
    if (!source.numPages) throw new Error('The PDF has no pages.');
    const output = await PDFDocument.create();
    for (let i = 1; i <= source.numPages; i++) {
      const page = await source.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 3200 / Math.max(viewport.width, viewport.height));
      const rendered = page.getViewport({ scale });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(rendered.width); canvas.height = Math.ceil(rendered.height);
      await page.render({ canvas, viewport: rendered, background: 'rgb(255,255,255)' }).promise;
      const jpg = await output.embedJpg(canvas.toDataURL('image/jpeg', 0.94));
      const target = output.addPage([viewport.width, viewport.height]);
      target.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      canvas.width = canvas.height = 0; page.cleanup();
    }
    return new Blob([(await output.save({ useObjectStreams: false })).slice().buffer], { type: 'application/pdf' });
  } catch (error) {
    // Even without a browser renderer, expand modern PDF object streams for FPDI.
    try { return new Blob([(await expandPdfObjects(bytes)).slice().buffer], { type: 'application/pdf' }); }
    catch { throw error; }
  } finally { clearTimeout(timeout); await task.destroy(); }
}
