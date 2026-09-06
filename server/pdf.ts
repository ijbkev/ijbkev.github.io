import { PDFDocument, PDFName, rgb, degrees, type PDFFont, type PDFPage, type PDFEmbeddedPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBytes from './fonts/NotoSans-Regular.ttf';
import ngoLogoBytes from '../public/logo.png';
import erasmusLogoBytes from '../public/reimbursement/erasmus-logo.png';
import { supportingDocuments, flightRoute, claimReference, organisationName, reimbursement, legacyDeclarationText, type SavedClaim, type DocumentWarning } from '../shared/reimbursement';

export type TicketFile = { key?: string; bytes: Uint8Array; originalBytes?: Uint8Array; type: string; name: string };
const navy = rgb(0.08, 0.15, 0.3);
const grey = rgb(0.34, 0.39, 0.47);
const light = rgb(0.92, 0.94, 0.97);
const clean = (value: string) => (value || 'Not recorded').replace(/\p{Extended_Pictographic}/gu, '').replace(/[\r\n]+/g, ' ').trim();

function lines(value: string, width: number, font: PDFFont, size: number) {
  const result: string[] = [];
  let current = '';
  for (const word of clean(value).split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) { current = candidate; continue; }
    if (current) { result.push(current); current = ''; }
    for (const char of word) {
      if (font.widthOfTextAtSize(current + char, size) > width && current) { result.push(current); current = ''; }
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function generatePdf(claim: SavedClaim, files: TicketFile[], warnings: DocumentWarning[] = []) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const title = `Reimbursement Declaration - ${claim.participant.name} - ${claim.participant.team}`;
  doc.setTitle(title);
  doc.setAuthor(organisationName);
  doc.setCreationDate(new Date(claim.createdAt));
  const ngo = await doc.embedPng(ngoLogoBytes);
  const erasmus = await doc.embedPng(erasmusLogoBytes);
  let page!: PDFPage;
  let y = 0;
  function write(value: string, x: number, yy: number, size = 10, color = navy, target = page) {
    // Draw route arrows as vectors: the bundled text font lacks this glyph.
    const parts = clean(value).split('→');
    let cursor = x;
    parts.forEach((part, i) => {
      if (part) target.drawText(part, { x: cursor, y: yy, size, font, color });
      cursor += font.widthOfTextAtSize(part, size);
      if (i < parts.length - 1) {
        const width = font.widthOfTextAtSize('→', size);
        const middle = yy + size * 0.35;
        const tip = cursor + width - 0.5;
        const thickness = Math.max(0.5, size * 0.065);
        target.drawLine({ start: { x: cursor + 0.5, y: middle }, end: { x: tip, y: middle }, thickness, color });
        target.drawLine({ start: { x: tip - size * 0.2, y: middle + size * 0.2 }, end: { x: tip, y: middle }, thickness, color });
        target.drawLine({ start: { x: tip - size * 0.2, y: middle - size * 0.2 }, end: { x: tip, y: middle }, thickness, color });
        cursor += width;
      }
    });
  }
  function newPage(heading = title) {
    page = doc.addPage([595.28, 841.89]);
    page.drawImage(ngo, { x: 40, y: 774, ...ngo.scaleToFit(55, 48) });
    page.drawImage(erasmus, { x: 405, y: 780, ...erasmus.scaleToFit(150, 40) });
    const headingLines = lines(heading, 515, font, 16);
    y = 748;
    headingLines.forEach(line => { write(line, 40, y, 16); y -= 21; });
    for (const line of lines(organisationName, 515, font, 9)) { write(line, 40, y, 9, grey); y -= 13; } y -= 5;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: navy });
    y -= 24;
  }
  function ensure(height: number) { if (y - height < 55) newPage('Reimbursement Declaration - continued'); }
  function section(title: string) {
    ensure(80);
    write(title.toUpperCase(), 40, y, 10, rgb(0.05, 0.37, 0.52));
    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.7, color: navy }); y -= 20;
  }
  function pairs(fields: [string, string][]) {
    for (let i = 0; i < fields.length; i += 2) {
      const row = fields.slice(i, i + 2).map(([label, value]) => ({ label, wrapped: lines(value, 245, font, 9) }));
      const height = Math.max(...row.map(f => f.wrapped.length)) * 12 + 25;
      ensure(height);
      row.forEach((f, j) => { const x = 40 + j * 267; write(f.label.toUpperCase(), x, y, 7, grey); f.wrapped.forEach((line, k) => write(line, x, y - 14 - k * 12, 9)); });
      y -= height;
    }
  }
  function field(label: string, value: string) {
    const wrapped = lines(value, 270, font, 10);
    ensure(wrapped.length * 14 + 10); write(label, 40, y, 9, grey);
    wrapped.forEach((line, i) => write(line, 285, y - i * 14)); y -= wrapped.length * 14 + 10;
  }
  const p = claim.participant;
  newPage();
  section('Project');
  pairs([['Project title', claim.projectName], ['Project number', claim.projectCode], ['Activity start date', claim.activityStartDate ?? 'Not recorded'], ['Activity end date', claim.activityEndDate ?? 'Not recorded'], ['Destination city', claim.destinationCity ?? 'Not recorded'], ['Submission reference', claimReference(claim)], ['Submitted (UTC)', claim.createdAt.replace('T', ' ').slice(0, 19)]]);
  section('Participant');
  pairs([['Full name (as in ID)', p.name], ['Country of residence', p.team], ['Citizenship', p.citizenship], ['Date of birth', p.dateOfBirth], ['Role', p.role], ['Email', p.email], ['Phone', p.phone], ['Home address', p.address], ['City of residence', p.city], ['Arrival in destination country', p.arrivalDate], ['Departure from destination country', p.departureDate]]);
  section('Bank details for the transfer');
  pairs([['Account holder', p.accountHolder], ['Bank name', p.bankName], ['Account / IBAN', p.bankAccount], ['BIC / SWIFT', p.bic], ['Bank address', p.bankAddress], ['Green travel', p.greenTravel ? 'Yes' : 'No']]);

  newPage('Travel and reimbursement');
  section('Travel');
  function tableHeader() {
    page.drawRectangle({ x: 40, y: y - 9, width: 515, height: 23, color: navy });
    ['#', 'FROM / TO', 'TRAVEL DATE', 'TRANSPORT / FORMAT', 'EUR'].forEach((label, i) => write(label, [46, 68, 245, 322, 495][i], y, 7, rgb(1, 1, 1)));
    y -= 27;
  }
  const attachmentLinks: { page: PDFPage; y: number; key: string }[] = [];
  tableHeader();
  for (const ticket of claim.tickets) {
    const route = lines(flightRoute(ticket), 165, font, 9);
    const mode = lines(`${ticket.mode} / ${ticket.ticketType ?? 'Format not recorded'}`, 165, font, 8);
    const rateLines = lines(`Exchange rate: 1 ${ticket.currency} = ${ticket.rate} EUR | Rate date: ${ticket.rateDate} | ${ticket.source}`, 485, font, 8);
    const rowHeight = Math.max(route.length, mode.length) * 12 + rateLines.length * 11 + 70;
    if (y - rowHeight < 60) { newPage('Travel - continued'); tableHeader(); }
    const top = y;
    write(String(ticket.serial), 46, y, 8);
    route.forEach((line, i) => write(line, 68, top - i * 12, 9));
    write(ticket.travelDate, 245, top, 8);
    mode.forEach((line, i) => write(line, 322, top - i * 12, 8));
    const money = (ticket.euroCents / 100).toFixed(2);
    write(money, 550 - font.widthOfTextAtSize(money, 8), top, 8);
    y -= Math.max(route.length, mode.length) * 12 + 6;
    const columns = [68, 185, 315, 455];
    ['Purchase date', 'Currency of purchase', 'Amount in local currency', 'Amount in EUR'].forEach((label, i) => write(label, columns[i], y, 7, grey));
    y -= 14;
    [ticket.purchaseDate, ticket.currency, ticket.amount.toFixed(2), (ticket.euroCents / 100).toFixed(2)].forEach((value, i) => write(value, columns[i], y, 8));
    y -= 16;
    rateLines.forEach(line => { write(line, 68, y, 8, grey); y -= 11; });
    attachmentLinks.push({ page, y, key: `ticket-${ticket.serial}` });
    y -= 15;
    for (const pass of supportingDocuments({ tickets: [ticket] }).filter(d => d.isBoardingPass)) {
      const wrapped = lines(`${pass.label}: ${pass.route}`, 410, font, 8);
      ensure(wrapped.length * 12 + 28);
      write('0.00 EUR', 495, y, 8);
      for (const line of wrapped) { write(line, 68, y, 8); y -= 12; }
      attachmentLinks.push({ page, y, key: pass.key }); y -= 18;
    }
    y -= 6; page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.4, color: light }); y -= 12;
  }
  ensure(215);
  section('Reimbursement calculation');
  const totals = reimbursement(claim);
  const eur = (cents: number) => `EUR ${(cents / 100).toFixed(2)}`;
  field('Total eligible / submitted expenses', eur(claim.totalCents));
  field('Country reimbursement limit', claim.countryLimitCents === undefined ? 'Not recorded (legacy claim)' : eur(claim.countryLimitCents));
  field('Extra reimbursement (admin approved)', eur(totals.extraCents));
  page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 35, color: light });
  write('Final reimbursement amount', 49, y - 3, 12); write(eur(totals.finalCents), 370, y - 3, 12); y -= 45;
  if (p.notes) { section('Notes from the participant'); const notes = lines(p.notes, 515, font, 9); for (const line of notes) { ensure(15); write(line, 40, y, 9); y -= 14; } y -= 15; }
  const declaration = (claim.declarationText ?? legacyDeclarationText).split(/\n\s*\n/);
  if (declaration.length > 1) newPage('Declaration and signature');
  section('Declaration and signature');
  declaration.forEach((point, index) => {
    const wrapped = lines(point, 493, font, 9);
    ensure(wrapped.length * 13 + 10);
    write(`${index + 1}.`, 40, y, 9);
    wrapped.forEach(line => { write(line, 62, y, 9); y -= 13; });
    y -= 8;
  });
  ensure(155);
  try {
    const signature = await doc.embedPng(claim.signature);
    page.drawImage(signature, { x: 40, y: y - 75, ...signature.scaleToFit(240, 65) });
  } catch { warnings.push({ key: 'signature', filename: 'Signature', message: 'Signature could not be displayed. Manual review required.' }); write('Signature could not be displayed. Manual review required.', 40, y - 20, 9, rgb(0.73, 0.11, 0.11)); }
  y -= 92;
  pairs([['Signed by', p.name], ['Place / date (UTC)', `${p.signaturePlace || 'Place not recorded'}, ${claim.createdAt.slice(0, 10)}`]]);

  // Each ticket occupies exactly one output page. Multi-page source PDFs are
  // stacked on one extended page, preserving every source page at readable size.
  const ticketPages = new Map<string, PDFPage>();
  const documents = supportingDocuments(claim);
  for (let i = 0; i < files.length; i++) {
    const document = documents[i];
    const ticket = document.ticket;
    const file = files[i];
    const pieces: { embedded: PDFEmbeddedPage; rotation: number; width: number; height: number }[] = [];
    let img;
    let issue = '';
    try {
    if (!file.bytes.length) throw new Error('Missing document');
    if (file.type === 'application/pdf') {
      const source = await PDFDocument.load(file.bytes);
      if (source.getPageCount() < 1) throw new Error('PDF has no pages');
      const form = source.getForm();
      if (form.getFields().length) form.flatten();
      const probe = await PDFDocument.create();
      for (const sourcePage of source.getPages()) {
        if (!sourcePage.node.Contents()) sourcePage.drawText('');
        const embedded = await probe.embedPage(sourcePage);
        await embedded.embed();
      }
      for (const sourcePage of source.getPages()) {
        const box = sourcePage.getCropBox();
        if (!(box.width > 0 && box.height > 0)) throw new Error(`Ticket ${i + 1}: unsupported page dimensions`);
        const rotation = ((sourcePage.getRotation().angle % 360) + 360) % 360;
        const embedded = await doc.embedPage(sourcePage, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height });
        const sideways = rotation === 90 || rotation === 270;
        await embedded.embed();
        pieces.push({ embedded, rotation, width: sideways ? box.height : box.width, height: sideways ? box.width : box.height });
      }
    } else {
      img = file.type === 'image/png' ? await doc.embedPng(file.bytes) : await doc.embedJpg(file.bytes);

    }
    } catch {
      pieces.length = 0; img = undefined;
      issue = file.bytes.length ? 'This document could not be displayed. Its original file is attached for manual review.' : 'Supporting document missing. The claim was generated successfully.';
      warnings.push({ key: document.key, filename: document.filename || document.label, message: issue });
      if (file.bytes.length) await doc.attach(file.originalBytes ?? file.bytes, `${document.key}-${file.name || 'original.pdf'}`, { mimeType: file.type });
    }
    const groups = pieces.length ? Array.from({ length: Math.ceil(pieces.length / 10) }, (_, n) => pieces.slice(n * 10, n * 10 + 10)) : [[]];
    for (const group of groups) {
    const heights = group.map(p => p.height * Math.min(515 / p.width, 680 / p.height));
    const projectLines = lines(`${clean(claim.projectName)} | ${claim.projectCode} | ${claim.participant.name}`, 515, font, 9);
    const routeLines = lines(`${document.route} | EUR ${(document.euroCents / 100).toFixed(2)} | Travel: ${ticket.travelDate}`, 515, font, 10);
    const headerHeight = 140 + projectLines.length * 13 + routeLines.length * 14;
    const ticketHeight = Math.max(841.89, headerHeight + 60 + heights.reduce((a, b) => a + b, 0) + Math.max(0, group.length - 1) * 25);
    const ticketPage = doc.addPage([595.28, ticketHeight]);
    if (!ticketPages.has(document.key)) ticketPages.set(document.key, ticketPage);
    ticketPage.drawRectangle({ x: 0, y: ticketHeight - 64, width: 595.28, height: 64, color: navy });
    write(`${document.label} | ${ticket.mode}`, 40, ticketHeight - 40, document.isBoardingPass ? 12 : 19, rgb(1, 1, 1), ticketPage);
    let top = ticketHeight - 87;
    for (const line of projectLines) { write(line, 40, top, 9, grey, ticketPage); top -= 13; }
    for (const line of routeLines) { write(line, 40, top, 10, navy, ticketPage); top -= 14; }
    top -= 12;
    for (const line of lines(document.filename || 'No file uploaded', 515, font, 8)) { write(line, 40, top, 8, grey, ticketPage); top -= 11; }
    top -= 8;
    if (issue) for (const line of lines(issue, 515, font, 10)) { write(line, 40, top, 10, rgb(0.73, 0.11, 0.11), ticketPage); top -= 15; }
    if (img) {
      const size = img.scaleToFit(515, top - 55);
      ticketPage.drawImage(img, { x: (595.28 - size.width) / 2, y: top - size.height, ...size });
    }
    for (let j = 0; j < group.length; j++) {
      const p = group[j];
      const scale = Math.min(515 / p.width, 680 / p.height);
      const w = p.width * scale, h = p.height * scale;
      const left = (595.28 - w) / 2, bottom = top - h;
      const offsets: Record<number, [number, number]> = { 0: [0, 0], 90: [0, h], 180: [w, h], 270: [w, 0] };
      const [dx, dy] = offsets[p.rotation] ?? [0, 0];
      ticketPage.drawPage(p.embedded, { x: left + dx, y: bottom + dy, xScale: scale, yScale: scale, rotate: degrees(-p.rotation) });
      top -= h + 25;
    }
  }
  }
  for (const link of attachmentLinks) {
    const destination = ticketPages.get(link.key)!;
    const label = `Attachment on page ${doc.getPages().indexOf(destination) + 1} - go to page`;
    write(label, 68, link.y, 8, rgb(0.05, 0.37, 0.65), link.page);
    const annotation = doc.context.register(doc.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [68, link.y - 3, 68 + font.widthOfTextAtSize(label, 8), link.y + 10],
      Border: [0, 0, 0], Dest: [destination.ref, PDFName.of('Fit')],
    }));
    link.page.node.addAnnot(annotation);
  }
  doc.getPages().forEach((p, i) => {
    const footer = lines(`IJBK e.V. | Ref. ${claimReference(claim)}`, 410, font, 7);
    footer.forEach((line, j) => write(line, 40, 32 - j * 9, 7, grey, p));
    write(`Page ${i + 1} of ${doc.getPageCount()}`, 485, 27, 7, grey, p);
  });
  return doc.save();
}
