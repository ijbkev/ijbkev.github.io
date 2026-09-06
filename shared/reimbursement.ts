import { z } from 'zod';
import countryNames from './countries.json';
export const countryCode = (name: string) => (countryNames as Record<string, string>)[name.trim().toLowerCase()];
export const organisationName = 'Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.';

export const currencies = [
  { code: 'EUR', name: 'Euro' }, { code: 'CZK', name: 'Czech koruna' },
  { code: 'DKK', name: 'Danish krone' }, { code: 'HUF', name: 'Hungarian forint' },
  { code: 'PLN', name: 'Polish zloty' }, { code: 'RON', name: 'Romanian leu' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'TRY', name: 'Turkish lira' },
] as const;
export const travelModes = ['Car', 'Bus', 'Train', 'Flight'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 40 * 1024 * 1024;
export const MAX_TICKETS = 30;
export const today = () => new Date().toISOString().slice(0, 10);
const text = (label: string, max = 160) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`).refine(v => [...v].every(c => c.charCodeAt(0) >= 32 || ['\t', '\n', '\r'].includes(c)), 'Unsupported control character');
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid calendar date');
export const purchaseDateSchema = calendarDate.refine(v => v >= '1999-01-04' && v <= today(), 'Purchase date must be between 4 January 1999 and today');
export const boardingPassSchema = z.object({
  journey: z.enum(['outbound', 'return']),
  from: z.string().trim().max(120).default(''), to: z.string().trim().max(120).default(''),
  filename: z.string().max(180).optional(),
});
export type BoardingPass = z.infer<typeof boardingPassSchema>;
export type DocumentWarning = { key: string; filename: string; message: string };
export const ticketSchema = z.object({
  journeyType: z.enum(['one-way', 'round-trip']).optional(),
  connections: z.boolean().optional(),
  boardingPasses: z.array(boardingPassSchema).max(24).optional(),
  purchaseDate: purchaseDateSchema,
  travelDate: calendarDate,
  from: text('Departure', 120), to: text('Destination', 120),
  mode: z.enum(travelModes),
  ticketType: z.enum(['Paper ticket', 'Electronic ticket']),
  currency: z.enum(['EUR', 'CZK', 'DKK', 'HUF', 'PLN', 'RON', 'SEK', 'TRY']),
  amount: z.number().finite().positive('Enter an amount greater than zero').max(100000000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, 'Use at most two decimal places'),
}).superRefine((ticket, ctx) => {
  if (ticket.mode !== 'Flight' && ticket.boardingPasses?.length) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Boarding passes must belong to a flight' });
  if (ticket.journeyType !== 'round-trip' && ticket.boardingPasses?.some(p => p.journey === 'return')) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Return segments require a round trip' });
  for (const journey of ['outbound', 'return']) if ((ticket.boardingPasses?.filter(p => p.journey === journey).length ?? 0) > 12) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Use at most 12 segments per journey' });
  if (ticket.travelDate < ticket.purchaseDate) ctx.addIssue({ code: 'custom', path: ['travelDate'], message: 'Travel date cannot precede purchase date' });
});
export const participantSchema = z.object({
  firstName: text('First name', 80), lastName: text('Last name', 80),
  name: z.string().optional(), citizenship: text('Citizenship', 80),
  team: text('Country of residence', 80),
  city: text('City of residence', 120),
  greenTravel: z.boolean().default(false), notes: z.string().trim().max(2000).default(''),
  arrivalDate: calendarDate, departureDate: calendarDate,
  role: z.enum(['Participant', 'Team Leader', 'Facilitator']),
  bankName: text('Bank name'), accountHolder: text('Account holder'), signaturePlace: text('Place of signature', 120),
  dateOfBirth: calendarDate.refine(v => v >= '1900-01-01' && v < today(), 'Enter a valid date of birth'),
  email: z.string().trim().email('Enter a valid email').max(254),
  phone: text('Phone number', 40).refine(v => /^\+?[0-9 ()\-.]{6,40}$/.test(v), 'Enter a valid phone number'),
  bankAccount: text('Bank account / IBAN', 80),
  bic: z.string().trim().toUpperCase().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC must contain 8 or 11 letters and numbers'),
  bankAddress: text('Bank address', 500), address: text('Participant address', 500),
}).refine(p => p.departureDate >= p.arrivalDate, { path: ['departureDate'], message: 'Departure cannot precede arrival' }).transform(p => ({ ...p, name: `${p.firstName} ${p.lastName}` }));
export const claimSchema = z.object({
  requestId: z.string().uuid(), participant: participantSchema,
  tickets: z.array(ticketSchema).min(1, 'Add at least one ticket').max(MAX_TICKETS),
  signature: z.string().max(300000).startsWith('data:image/png;base64,'),
  declaration: z.literal(true, { errorMap: () => ({ message: 'Confirm the declaration before submitting' }) }),
});
const centsSchema = z.number().int().min(0).max(10000000000);
export const projectDetailsSchema = z.object({
  shortName: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,30}$/, 'Use a short project name with only letters and numbers, without spaces'),
  activityStartDate: calendarDate, activityEndDate: calendarDate, destinationCity: text('Destination city', 120),
  countryCodes: z.record(z.string()).default({}),
  countryLimits: z.record(centsSchema),
});
export const extraSchema = z.object({ extraCents: centsSchema, note: z.string().trim().max(1000) });
export const settingsSchema = z.object({
  ...projectDetailsSchema.shape,
  projectCode: text('Project code', 120),
  countries: z.array(text('Country', 80)).min(1, 'Add participating countries').max(40).refine(v => new Set(v.map(x => x.toLowerCase())).size === v.length, 'Remove duplicate countries'),
  accessCode: z.string().min(8, 'Use at least 8 characters').max(128).optional(),
  enabled: z.boolean(),
}).superRefine((s, ctx) => {
  for (const country of s.countries) {
    if (!countryCode(country)) ctx.addIssue({ code: 'custom', message: `Use a recognised country name for ${country}` });
    if (!Object.prototype.hasOwnProperty.call(s.countryLimits, country)) ctx.addIssue({ code: 'custom', message: `Set the reimbursement limit for ${country}` });
  }
  if (new Set(s.countries.map(countryCode)).size !== s.countries.length) ctx.addIssue({ code: 'custom', message: 'Remove duplicate countries, including alternate names' });
  if (s.activityEndDate < s.activityStartDate) ctx.addIssue({ code: 'custom', path: ['activityEndDate'], message: 'Activity end date cannot precede start date' });
}).transform(s => ({ ...s, countryCodes: Object.fromEntries(s.countries.map(c => [c, countryCode(c)!])) }));
export type Participant = z.infer<typeof participantSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;
export type Rate = { currency: string; requestedDate: string; rateDate: string; rate: number; source: string };
export type CalculatedTicket = TicketInput & Rate & { serial: number; euroCents: number; filename: string };
export type ProjectDetails = z.infer<typeof projectDetailsSchema>;
export type ProjectSettings = Partial<ProjectDetails> & { projectCode: string; countries: string[]; enabled: boolean; hasAccessCode: boolean };
export type SavedClaim = { projectShortName?: string; activityStartDate?: string; activityEndDate?: string; declarationText?: string; reference?: string; activityDuration?: string; destinationCity?: string; countryLimitCents?: number; extraCents?: number; extraNote?: string; extraApprovedAt?: string; id: string; projectId: string; projectName: string; projectCode: string; participant: Participant; tickets: CalculatedTicket[]; totalCents: number; signature: string; createdAt: string; declaration: true };
export type ClaimSummary = { reference?: string; finalCents?: number; id: string; name: string; team: string; email: string; totalCents: number; createdAt: string };
export const euroCents = (amount: number, rate: number) => Math.round((amount * rate + Number.EPSILON) * 100);
export const euro = (cents: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function reimbursement(claim: Pick<SavedClaim, 'totalCents' | 'countryLimitCents' | 'extraCents'>) {
  const standardCents = Math.min(claim.totalCents, claim.countryLimitCents ?? claim.totalCents);
  const extraCents = claim.extraCents ?? 0;
  return { standardCents, extraCents, finalCents: standardCents + extraCents };
}
export function submissionReference(shortName: string, code: string, firstName: string, lastName: string, date: string) {
  const compact = (v: string) => v.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
  return `${compact(shortName)}_${code.toUpperCase()}_${compact(firstName)}_${compact(lastName)}_${date.slice(0, 10).replace(/-/g, '_')}`;
}
export function claimReference(claim: SavedClaim) {
  const p = claim.participant;
  const first = p.firstName || p.name.split(' ')[0];
  const last = p.lastName || p.name.split(' ').slice(1).join(' ');
  const code = countryCode(p.team) || 'XX';
  const oldSuffix = `${code}${first.replace(/[^\p{L}\p{N}-]/gu, '')}-${last.replace(/[^\p{L}\p{N}-]/gu, '')}`;
  const oldPrefix = claim.reference?.endsWith(oldSuffix) ? claim.reference.slice(0, -oldSuffix.length) : undefined;
  const prefix = claim.projectShortName || (claim.reference?.includes('_') ? claim.reference.split('_')[0] : oldPrefix) || claim.projectName;
  return submissionReference(prefix, code, first, last, claim.createdAt);
}
export function pdfFilename(claim: SavedClaim) {
  // eslint-disable-next-line no-control-regex -- Remove unsafe filename control characters.
  return `Reimbursement Declaration - ${claim.participant.name} - ${claim.participant.team}.pdf`.replace(/[\x00-\x1f\x7f/\\:"<>|?*]/g, '');
}

export const declarationPoints = [
  "I declare that all information provided is true and complete, and that all tickets and supporting documents are genuine, unaltered, and relate to my travel for this project.",
  "These expenses have not been and will not be reimbursed from any other source.",
  "If any document is found to be forged, falsified, Photoshopped, digitally manipulated, or otherwise intentionally altered, I understand that IJBK reserves the right to cancel my entire reimbursement.",
  "I authorize IJBK to use the provided details to process my reimbursement.",
  "Deadline: This claim, together with all supporting documents, must be submitted within 15 days of the last day of the activity. Claims received after this deadline cannot be reimbursed.",
  "Ceiling: Reimbursement is limited to the applicable Erasmus+ distance-band amount for the participant’s city of departure. Higher actual costs may be declared in full, but reimbursement will not exceed this maximum; any amount above the ceiling is borne by the participant. In special cases, extra costs for travel may be reimbursed by the organiser.",
  "Actual costs only: Only costs supported by the attached tickets, invoices, receipts, and other required evidence will be reimbursed, up to the applicable ceiling.",
  "Payment conditions: Payment will be made only after (a) the participant’s full attendance at the activity has been confirmed and (b) the agreed dissemination activities have been completed and validated by IJBK. The transfer will normally be made within two weeks of such validation.",
  "Incomplete claims: If required documents are missing, IJBK will contact the participant once by email. If the missing documents are not provided within 14 days of that email, the reimbursement claim will be closed.",
  "Transfer: Reimbursement will be made by SEPA transfer in EUR to the bank account stated in the claim. Any charges imposed by the receiving bank are borne by the participant."
];
export const declarationText = declarationPoints.join("\n\n");

export const legacyDeclarationText = 'I confirm that these details are accurate, these expenses were incurred for this project, and the uploaded tickets correspond to the listed journeys. I authorize IJBK to use these details to process my reimbursement.';

export const flightRoute = (ticket: Pick<TicketInput, 'from' | 'to' | 'mode' | 'journeyType'>) =>
  `${ticket.from} → ${ticket.to}${ticket.mode === 'Flight' && ticket.journeyType === 'round-trip' ? ` → ${ticket.from}` : ''}`;

// A single ordered list drives storage, review, tables and PDF attachment pages.
// Boarding passes never participate in reimbursement totals.
export function supportingDocuments(claim: Pick<SavedClaim, 'tickets'>) {
  return claim.tickets.flatMap(ticket => [
    { key: `ticket-${ticket.serial}`, label: `Ticket ${ticket.serial}`, ticket, filename: ticket.filename, from: ticket.from, to: ticket.to, route: flightRoute(ticket), amount: ticket.amount, currency: ticket.currency, euroCents: ticket.euroCents, isBoardingPass: false },
    ...(ticket.mode === 'Flight' ? ticket.boardingPasses ?? [] : []).map((pass, i) => ({
      key: `boarding-${ticket.serial}-${i + 1}`, label: `Flight ${ticket.serial} / ${pass.journey === 'return' ? 'Return' : 'Outbound'} boarding pass ${i + 1}`,
      ticket, filename: pass.filename ?? '', from: pass.from, to: pass.to, route: `${pass.from || 'Airport not recorded'} → ${pass.to || 'Airport not recorded'}`,
      amount: 0, currency: 'EUR', euroCents: 0, isBoardingPass: true,
    })),
  ]);
}
