import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBytes from './fonts/NotoSans-Regular.ttf';
import ngoLogoBytes from '../public/logo.png';
import euLogoBytes from '../public/reimbursement/eu-logo.png';
import erasmusLogoBytes from '../public/reimbursement/erasmus-logo.png';
import { organisationName, organisationPaymentDeclaration, type SavedOrganisationDeclaration } from '../shared/reimbursement';

const navy = rgb(0.08, 0.15, 0.3);
const grey = rgb(0.34, 0.39, 0.47);
const blue = rgb(0.05, 0.37, 0.52);
const light = rgb(0.92, 0.94, 0.97);
const clean = (value: string) => (value || 'Not recorded')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
  .replace(/[\r\n]+/g, ' ')
  .trim();
function wrap(value: string, width: number, font: PDFFont, size: number) {
  const result: string[] = []; let line = '';
  for (const word of clean(value).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else { if (line) result.push(line); line = word; }
  }
  if (line) result.push(line);
  return result;
}

export async function generateOrganisationDeclarationPdf(data: SavedOrganisationDeclaration) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const eu = await doc.embedPng(euLogoBytes), ngo = await doc.embedPng(ngoLogoBytes), erasmus = await doc.embedPng(erasmusLogoBytes);
  doc.setTitle(`Reimbursement Declaration - ${data.organisationName} - ${data.country}`);
  doc.setAuthor(organisationName);
  let page!: PDFPage, y = 0;
  const write = (value: string, x: number, yy: number, size = 10, color = navy, target = page) => target.drawText(clean(value), { x, y: yy, size, font, color });
  const fittedSize = (value: string, width: number, preferred: number, minimum = 6) => {
    let size = preferred;
    while (size > minimum && font.widthOfTextAtSize(clean(value), size) > width) size -= 0.25;
    return size;
  };
  const newPage = (title = 'Reimbursement Declaration') => {
    page = doc.addPage([595.28, 841.89]);
    page.drawImage(eu, { x: 40, y: 781, ...eu.scaleToFit(62, 42) });
    page.drawImage(ngo, { x: 116, y: 774, ...ngo.scaleToFit(55, 48) });
    page.drawImage(erasmus, { x: 405, y: 780, ...erasmus.scaleToFit(150, 40) });
    write(title, 40, 740, 17);
    write(organisationName, 40, 720, 8, grey);
    page.drawLine({ start: { x: 40, y: 704 }, end: { x: 555, y: 704 }, thickness: 1, color: navy });
    y = 680;
  };
  const heading = (text: string) => { write(text.toUpperCase(), 40, y, 10, blue); y -= 7; page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.7, color: navy }); y -= 16; };
  const pair = (left: [string, string], right: [string, string]) => {
    [{ field: left, x: 40 }, { field: right, x: 307 }].forEach(({ field: [label, value], x }) => { write(label.toUpperCase(), x, y, 7, grey); wrap(value, 245, font, 9).forEach((line, i) => write(line, x, y - 14 - i * 12, 9)); });
    y -= 34;
  };
  newPage();
  heading('Project and organisation');
  pair(['Project', data.projectName], ['Project code', data.projectCode]);
  pair(['Destination', data.destinationCity], ['Activity dates', `${data.activityStartDate} to ${data.activityEndDate}`]);
  pair(['Organisation', data.organisationName], ['Country', data.country]);
  heading('Participants and reimbursement');
  page.drawRectangle({ x: 40, y: y - 8, width: 515, height: 24, color: navy, borderColor: navy, borderWidth: 0.8 });
  write('ROLE', 48, y, 7, rgb(1, 1, 1)); write('NAME', 145, y, 7, rgb(1, 1, 1)); write('REIMBURSEMENT TO BE PAID', 390, y, 7, rgb(1, 1, 1)); y -= 28;
  const rowHeight = Math.max(15, Math.min(23, 184 / Math.max(data.participants.length, 1)));
  for (const [index, item] of data.participants.entries()) {
    const top = y + 8, bottom = top - rowHeight;
    page.drawRectangle({ x: 40, y: bottom, width: 515, height: rowHeight, color: index % 2 ? rgb(0.975, 0.982, 0.992) : rgb(1, 1, 1), borderColor: rgb(0.72, 0.77, 0.84), borderWidth: 0.55 });
    page.drawLine({ start: { x: 137, y: bottom }, end: { x: 137, y: top }, thickness: 0.45, color: rgb(0.72, 0.77, 0.84) });
    page.drawLine({ start: { x: 382, y: bottom }, end: { x: 382, y: top }, thickness: 0.45, color: rgb(0.72, 0.77, 0.84) });
    const fontSize = rowHeight < 18 ? 7 : 8.5;
    const labelSize = fittedSize(item.label, 81, fontSize), nameSize = fittedSize(item.name, 225, fontSize);
    write(item.label, 48, bottom + (rowHeight - labelSize) / 2 + 1, labelSize);
    write(item.name, 145, bottom + (rowHeight - nameSize) / 2 + 1, nameSize);
    const amount = `EUR ${(item.reimbursementCents / 100).toFixed(2)}`; write(amount, 547 - font.widthOfTextAtSize(amount, fontSize), bottom + (rowHeight - fontSize) / 2 + 1, fontSize);
    y -= rowHeight;
  }
  page.drawRectangle({ x: 40, y: y - 10, width: 515, height: 32, color: light, borderColor: rgb(0.58, 0.65, 0.75), borderWidth: 0.7 });
  write('TOTAL REIMBURSEMENT TO BE PAID BY BANK TRANSFER', 50, y, 10);
  const total = `EUR ${(data.totalCents / 100).toFixed(2)}`; write(total, 545 - font.widthOfTextAtSize(total, 11), y, 11); y -= 43;
  heading('Declaration');
  for (const line of wrap(organisationPaymentDeclaration(data), 515, font, 8)) { write(line, 40, y, 8); y -= 11; }
  y -= 7;
  const role = data.submitterRole ?? 'sending-organisation-member';
  const submitterName = data.submitterName || data.legalRepresentativeName;
  const submitterRole = role === 'team-leader' ? 'Team leader' : 'Member of the sending organisation';
  pair(['Submitted by', submitterRole], ['Name', submitterName]);
  if (role === 'sending-organisation-member') pair(['Position', data.submitterPosition], ['Contact', data.submitterPhone]);
  else pair(['Contact', data.submitterPhone], ['Email', data.submitterEmail]);
  if (role === 'sending-organisation-member') pair(['Email', data.submitterEmail], ['Date and place', `${data.signatureDate}, ${data.signaturePlace}`]);
  else pair(['Date and place', `${data.signatureDate}, ${data.signaturePlace}`], ['Signature role', 'Team leader']);
  write(`SIGNATURE OF THE ${role === 'team-leader' ? 'TEAM LEADER' : 'SENDING ORGANISATION MEMBER'} — ${submitterName}`, 40, y, 7, grey);
  try {
    const signature = await doc.embedPng(data.signature);
    page.drawImage(signature, { x: 40, y: y - 52, ...signature.scaleToFit(190, 42) });
  } catch { write('Signature could not be displayed.', 40, y - 20, 9, rgb(0.73, 0.11, 0.11)); }
  y -= 57;
  heading('Bank details');
  pair(['Account holder', data.accountHolder], ['IBAN', data.iban]);
  pair(['Bank country', data.bankCountry], ['SWIFT / BIC', data.swift]);
  doc.getPages().forEach((pdfPage, i) => {
    write(`IJBK e.V. | ${data.projectCode} | ${data.country}`, 40, 27, 7, grey, pdfPage);
    write(`Page ${i + 1} of ${doc.getPageCount()}`, 485, 27, 7, grey, pdfPage);
  });
  return doc.save();
}
