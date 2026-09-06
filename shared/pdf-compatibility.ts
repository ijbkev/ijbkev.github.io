import { PDFDocument } from 'pdf-lib';

/** Expand object/xref streams without changing the original upload. */
export async function expandPdfObjects(bytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  if (!pdf.getPageCount()) throw new Error('The PDF has no pages.');
  return pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
}
