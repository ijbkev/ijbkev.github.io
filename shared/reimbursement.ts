import { z } from 'zod';
import countryNames from './countries.json';
export const countryCode = (name: string) => (countryNames as Record<string, string>)[name.trim().toLowerCase()];
export const organisationName = 'Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.';

export const currencies = [
  { code: 'EUR', name: 'Euro' }, { code: 'CZK', name: 'Czech koruna' },
  { code: 'DKK', name: 'Danish krone' }, { code: 'HUF', name: 'Hungarian forint' },
  { code: 'PLN', name: 'Polish zloty' }, { code: 'RON', name: 'Romanian leu' },
  { code: 'NOK', name: 'Norwegian krone' }, { code: 'SEK', name: 'Swedish krona' },
  { code: 'TRY', name: 'Turkish lira' },
] as const;
export const travelModes = ['Car', 'Bus', 'Train', 'Flight'] as const;
export const receiptTypes = ['Food', 'Accommodation'] as const;
export const isReceipt = (ticket: { mode?: string }) => receiptTypes.some(type => type === ticket.mode);
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
  travelDate: z.union([calendarDate, z.literal('')]),
  from: text('Departure', 120), to: text('Destination', 120),
  mode: z.enum([...travelModes, ...receiptTypes]),
  ticketType: z.enum(['Paper ticket', 'Electronic ticket']),
  currency: z.enum(['EUR', 'CZK', 'DKK', 'HUF', 'PLN', 'RON', 'NOK', 'SEK', 'TRY']),
  amount: z.number().finite().positive('Enter an amount greater than zero').max(100000000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, 'Use at most two decimal places'),
}).superRefine((ticket, ctx) => {
  if (ticket.mode !== 'Flight' && ticket.boardingPasses?.length) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Boarding passes must belong to a flight' });
  if (ticket.journeyType !== 'round-trip' && ticket.boardingPasses?.some(p => p.journey === 'return')) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Choose a round trip to add return flights' });
  for (const journey of ['outbound', 'return']) if ((ticket.boardingPasses?.filter(p => p.journey === journey).length ?? 0) > 12) ctx.addIssue({ code: 'custom', path: ['boardingPasses'], message: 'Use at most 12 segments per journey' });
  if (!isReceipt(ticket) && !ticket.travelDate) ctx.addIssue({ code: 'custom', path: ['travelDate'], message: 'Travel date is required' });
  if (!isReceipt(ticket) && ticket.travelDate < ticket.purchaseDate) ctx.addIssue({ code: 'custom', path: ['travelDate'], message: 'Travel date cannot be before the purchase date' });
}).transform(ticket => isReceipt(ticket) ? { ...ticket, travelDate: '', to: ticket.mode } : ticket);
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
  bankAddress: z.string().trim().max(500).default(''), address: text('Participant address', 500),
}).refine(p => p.departureDate >= p.arrivalDate, { path: ['departureDate'], message: 'Departure date cannot be before the arrival date' }).transform(p => ({ ...p, name: `${p.firstName} ${p.lastName}` }));
export const claimSchema = z.object({
  requestId: z.string().uuid(), participant: participantSchema,
  tickets: z.array(ticketSchema).min(1, 'Add at least one ticket').max(MAX_TICKETS),
  signature: z.string().max(300000).startsWith('data:image/png;base64,'),
  declaration: z.literal(true, { errorMap: () => ({ message: 'Confirm the declaration before submitting' }) }),
}).superRefine((claim, ctx) => {
  if (!claim.tickets.some(ticket => !isReceipt(ticket))) ctx.addIssue({ code: 'custom', path: ['tickets'], message: 'Add at least one travel ticket' });
  if (claim.tickets.some(isReceipt) && (!claim.participant.greenTravel || claim.tickets.some(ticket => ticket.mode === 'Flight'))) ctx.addIssue({ code: 'custom', path: ['tickets'], message: 'Food and accommodation receipts require green travel with no flights' });
  if (claim.participant.greenTravel && claim.tickets.some(ticket => ticket.mode === 'Flight')) {
    ctx.addIssue({ code: 'custom', path: ['participant', 'greenTravel'], message: 'Green travel cannot be selected when any mode of travel is Flight' });
  }
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
  expectedParticipants: z.record(z.number().int().min(0).max(1000)).optional(),
  ...projectDetailsSchema.shape,
  projectCode: text('Project code', 120),
  countries: z.array(text('Country', 80)).min(1, 'Add participating countries').max(40).refine(v => new Set(v.map(x => x.toLowerCase())).size === v.length, 'Remove duplicate countries'),
  accessCode: z.string().max(128).optional(),
  partnerAccessCodes: z.record(z.string().max(128).nullable()).optional(),
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
export type ProjectSettings = Partial<ProjectDetails> & { demo?: boolean; country?: string; partnerAccessConfigured?: Record<string, boolean>; expectedParticipants?: Record<string, number>; projectCode: string; countries: string[]; enabled: boolean; organisationEnabled: boolean; hasAccessCode: boolean; hasOrganisationAccessCode: boolean };
export type GreenTravelCorrection = { previous: boolean; value: boolean; reason: string; correctedAt: string };
export type SavedClaim = { approvedAt?: string; greenTravelCorrections?: GreenTravelCorrection[]; projectShortName?: string; activityStartDate?: string; activityEndDate?: string; declarationText?: string; reference?: string; activityDuration?: string; destinationCity?: string; countryLimitCents?: number; extraCents?: number; extraNote?: string; extraApprovedAt?: string; id: string; projectId: string; projectName: string; projectCode: string; participant: Participant; tickets: CalculatedTicket[]; totalCents: number; signature: string; createdAt: string; declaration: true };
export type ClaimSummary = { approvedAt?: string; reference?: string; finalCents?: number; id: string; name: string; team: string; email: string; totalCents: number; createdAt: string };

export const organisationDeclarationSchema = z.object({
  requestId: z.string().uuid(),
  organisationName: text('Organisation name', 200),
  organisationOid: z.string().trim().max(40).default(''),
  country: text('Country', 80),
  submitterRole: z.enum(['team-leader', 'sending-organisation-member']),
  submitterName: text('Submitter name', 160),
  submitterPosition: z.string().trim().max(160, 'Position is too long').default(''),
  submitterPhone: text('Contact number', 40).refine(value => /^\+?[0-9 ()\-.]{6,40}$/.test(value), 'Enter a valid contact number'),
  submitterEmail: z.string().trim().email('Enter a valid email').max(254),
  signaturePlace: text('Place of signature', 120),
  signatureDate: calendarDate.refine(value => value <= today(), 'Signature date cannot be in the future'),
  accountHolder: text('Account holder', 160),
  iban: text('IBAN', 80),
  bankCountry: text('Bank country', 80),
  swift: z.string().trim().toUpperCase().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'SWIFT must contain 8 or 11 letters and numbers'),
  signature: z.string().max(300000).startsWith('data:image/png;base64,'),
  declaration: z.literal(true, { errorMap: () => ({ message: 'Confirm the declaration before submitting' }) }),
}).superRefine((value, ctx) => {
  if (value.submitterRole === 'sending-organisation-member' && !value.submitterPosition) ctx.addIssue({ code: 'custom', path: ['submitterPosition'], message: 'Position is required for a member of the sending organisation' });
}).transform(value => ({ ...value, submitterPosition: value.submitterRole === 'team-leader' ? '' : value.submitterPosition, legalRepresentativeName: value.submitterName }));
export type OrganisationDeclarationInput = z.infer<typeof organisationDeclarationSchema>;
export type OrganisationParticipant = { label: string; name: string; role: Participant['role']; reimbursementCents: number };
export type OrganisationFormData = ProjectDetails & { progress?: { expected: number | null; submitted: number; approved: number; pending: number; missing: number | null; ready: boolean }; projectName: string; projectCode: string; countries: string[]; country: string; participants: OrganisationParticipant[]; totalCents: number };
export type SavedOrganisationDeclaration = OrganisationDeclarationInput & OrganisationFormData & { id: string; projectId: string; createdAt: string };
export type OrganisationDeclarationSummary = { id: string; projectId: string; country: string; organisationName: string; legalRepresentativeName: string; totalCents: number; createdAt: string };

export const partnershipCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'UAH', 'RSD', 'ALL', 'BAM', 'MKD', 'MDL', 'GEL', 'AMD', 'AZN'] as const;
export const partnershipAgreementSchema = z.object({
  requestId: z.string().uuid(),
  partnerName: text('Partner name', 200),
  partnerOid: text('Partner OID', 40),
  partnerCountry: text('Partner country', 80),
  contactName: text('Contact name', 160),
  contactEmail: z.string().trim().email('Enter a valid email').max(254),
  contactPhone: text('Phone number', 40).refine(value => /^\+?[0-9 ()\-.]{6,40}$/.test(value), 'Enter a valid phone number'),
  iban: text('IBAN', 80),
  accountHolder: text('Account holder', 160),
  swift: z.string().trim().toUpperCase().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'SWIFT / BIC must contain 8 or 11 letters and numbers'),
  bankName: text('Bank name', 160),
  bankAddress: text('Bank address', 500),
  bankCurrency: z.enum(partnershipCurrencies),
  legalRepresentativeName: text('Legal representative name', 160),
  legalRepresentativePosition: text('Legal representative position', 160),
  signerEmail: z.string().trim().email('Enter a valid signer email').max(254),
  signaturePlace: text('Place of signature', 120),
  signatureDate: calendarDate.refine(value => value <= today(), 'Signature date cannot be in the future'),
  signature: z.string().max(300000).startsWith('data:image/png;base64,'),
  declaration: z.literal(true, { errorMap: () => ({ message: 'Confirm the agreement before submitting' }) }),
});
export type PartnershipAgreementInput = z.infer<typeof partnershipAgreementSchema>;
export type SigningEvidence = { signerName: string; signerRole: string; signerEmail: string; signedAt: string; maskedIp: string; userAgent: string; documentId: string; confirmation: string; sha256: string };
export type CoordinatorSignatureEvidence = { signerName: string; signerRole: string; organisation: string; issuedAt: string; documentId: string; statement: string };
export type SavedPartnershipAgreement = PartnershipAgreementInput & { id: string; projectId: string; projectName: string; projectCode: string; createdAt: string; signingEvidence: SigningEvidence; coordinatorSignatureEvidence: CoordinatorSignatureEvidence };
export type PartnershipAgreementSummary = { id: string; projectId: string; partnerCountry: string; partnerName: string; legalRepresentativeName: string; createdAt: string };

export const partnershipAgreementArticles = [
  { title: 'Article 1 - Purpose and governing documents', clauses: [
    ['1.1.', "This Agreement defines the Parties' responsibilities for the preparation, implementation, financing, safety, reporting and follow-up of the Project."],
    ['1.2.', 'The Project shall be implemented in accordance with the Grant Agreement and its annexes, the approved application and budget, any mandate or accession form, applicable Erasmus+ rules and quality standards, and this Agreement. In case of conflict, the Grant Agreement and mandatory law prevail.'],
    ['1.3.', 'This Agreement does not create an entitlement to any amount that is not accepted or paid by the German National Agency.'],
  ]},
  { title: 'Article 2 - Duration', clauses: [
    ['2.1.', 'This Agreement enters into force on the date of the last signature and, where legally permitted, applies from the start of the Project eligibility period.'],
    ['2.2.', 'It remains effective until all Project tasks, payments, reports, audits, recoveries, confidentiality and data-protection obligations have been completed.'],
  ]},
  { title: 'Article 3 - Roles and responsibilities', clauses: [
    ['3.1.', 'Each Party shall perform its assigned tasks lawfully, professionally, on time and in accordance with the approved Project plan. Each Party remains responsible for its own acts and omissions and for the persons engaged by it.'],
    ['3.2.', 'The Coordinator is responsible for overall coordination, communication with the National Agency, consolidated reporting, verification of partner documentation, financial administration and transfer of Project funds subject to this Agreement and the Grant Agreement.'],
    ['3.3.', 'The Partner is responsible for its national group and assigned tasks, including:\n(a) selecting eligible participants and a competent adult group leader in accordance with the approved profile;\n(b) preparing participants, supporting travel arrangements and providing programme, safety, emergency, reimbursement and Code of Conduct information before departure;\n(c) checking identity, residence, eligibility and required insurance or health-cover documents;\n(d) supporting participants throughout the Project, collecting required evidence and contributing to evaluation, dissemination and follow-up; and\n(e) providing complete and accurate information and documents by the deadlines communicated by the Coordinator.'],
    ['3.4.', "If the Partner does not select and confirm the required number of eligible participants by the deadline communicated in writing, the Coordinator may, in coordination with the Partner, assist with or complete the selection and confirm suitable participants for the Partner's national group. The Partner shall reasonably cooperate and provide the information and documents required to verify eligibility. This does not release the Partner from its remaining obligations unless otherwise agreed in writing."],
    ['3.5.', 'The Partner shall immediately inform the Coordinator of any delay, participant withdrawal, legal or financial risk, safeguarding concern, conflict of interest, suspected fraud, serious complaint or other circumstance that could materially affect the Project.'],
  ]},
  { title: 'Article 4 - Participant safety, conduct and incidents', clauses: [
    ['4.1.', 'The Parties shall cooperate in risk assessment and take reasonable and proportionate measures to provide a safe, respectful and non-discriminatory environment. The Coordinator or host addresses risks under its control at the venue and in the common programme; the Partner addresses risks connected with its participant selection, preparation, travel arrangements, national group and group leadership.'],
    ['4.2.', 'The Partner shall ensure that its participants and group leader receive and follow the Project Code of Conduct and reasonable safety and emergency instructions. The group leader shall remain reasonably available, monitor wellbeing and conduct, and cooperate with the Coordinator and host team.'],
    ['4.3.', 'Participants remain personally responsible for intentional, illegal, reckless or clearly prohibited conduct. A participant who seriously endangers themselves or others, harasses others, damages property, uses illegal substances, carries prohibited items or repeatedly ignores safety instructions may be removed from an activity or required to leave the Project, subject to proportionality, safeguarding needs and applicable law.'],
    ['4.4.', 'Serious injury, hospitalisation, police involvement, a missing person, safeguarding allegation, major property damage or death must be reported to the Coordinator immediately. The Parties shall prioritise protection of life and health, contact emergency services where necessary, document the facts and cooperate with insurers, authorities, the National Agency and affected families as legally appropriate.'],
  ]},
  { title: 'Article 5 - Liability and indemnification', clauses: [
    ['5.1.', "No Party is liable merely because an incident occurred. Responsibility shall be determined by applicable law, the Party's duties, causation, fault and the circumstances of the case."],
    ['5.2.', "To the maximum extent permitted by law, the Coordinator is not responsible for loss, injury, death, damage, fines or claims caused solely by a participant's intentional, illegal, reckless or clearly prohibited conduct; refusal to follow reasonable safety instructions; risks outside the Coordinator's reasonable control; or the Partner's breach of its selection, preparation, supervision, insurance, reporting or safeguarding duties."],
    ['5.3.', "Nothing in this Agreement excludes or limits liability that cannot legally be excluded, including liability for a Party's own intentional misconduct and other mandatory liability. Each Party remains responsible for direct loss caused by its own breach, negligence or intentional act or omission."],
    ['5.4.', "The Partner shall indemnify the Coordinator against third-party claims, grant recoveries, penalties and reasonable external costs to the extent caused by the Partner's breach, false or incomplete information, ineligible participant selection, failure to prepare or support its national group, misuse of funds, or acts or omissions of persons for whom the Partner is legally responsible. This does not apply to the extent the matter was caused by the Coordinator's own breach, negligence or intentional misconduct."],
  ]},
  { title: 'Article 6 - Payments, reimbursement and bank account', clauses: [
    ['6.1.', "Project payments are conditional on the availability of grant funds, satisfactory completion of assigned tasks and timely submission of complete and credible supporting documents. The Coordinator may deduct expenditure paid on the Partner's behalf where agreed or properly documented."],
    ['6.2.', 'The Partner designates the following account to receive Partner funds including participant travel reimbursement:'],
    ['6.3.', 'Payment by the Coordinator to the verified account above constitutes valid payment and discharges the Coordinator for that amount. The Partner is responsible for correct and timely onward reimbursement to its participants and group leader and shall provide proof of payment on request.'],
    ['6.4.', 'Unless otherwise agreed in writing, onward reimbursement shall be completed within ten business days after the Partner receives the relevant funds. The Partner shall not make unauthorised deductions, participation charges or unrelated set-offs from participant reimbursements.'],
    ['6.5.', 'Any change of bank account must be notified by an authorised representative and independently verified by the Coordinator. The Coordinator may suspend, withhold, reduce or set off payment where documentation is missing, tasks are incomplete, eligibility is doubtful, funds may have been misused, or a grant recovery is reasonably expected.'],
    ['6.6.', 'The Partner shall repay within thirty days any amount rejected or recovered by the National Agency to the extent attributable to the Partner, its participants, staff or group leader, including amounts resulting from false information, ineligible participation, missing evidence or misuse of funds.'],
  ]},
  { title: 'Article 7 - Reporting, records, visibility and data protection', clauses: [
    ['7.1.', 'The Partner shall provide accurate information and all documents reasonably required for Project reporting, audits, participant evidence and grant calculations by the deadlines set by the Coordinator, and shall retain legally valid records for the period required by the Grant Agreement and applicable law.'],
    ['7.2.', 'The Parties shall support evaluation and dissemination and shall use the required Erasmus+ and EU visibility statements and visual identity. Public communication must be accurate and respect confidentiality, safeguarding and consent requirements.'],
    ['7.3.', 'Each Party shall process personal data lawfully and securely for legitimate Project purposes. Medical, safeguarding, incident and bank information shall be shared only with authorised persons who need it for lawful Project duties. Confidentiality continues after the Project ends.'],
  ]},
  { title: 'Article 8 - Communication, changes and conflict of interest', clauses: [
    ['8.1.', 'Each Party shall appoint a Project Contact and an Emergency or Safeguarding Contact (which can be identical). Day-to-day coordination may take place through agreed messaging tools, but formal approvals, financial instructions, bank changes, warnings, suspension and termination notices must be confirmed by email.'],
    ['8.2.', 'No material change to participants, dates, activities, travel arrangements, responsibilities or use of funds may be made without prior written agreement where the change affects eligibility, safety, quality or reporting.'],
    ['8.3.', 'The Parties shall avoid conflicts of interest and immediately disclose any situation that could affect impartial implementation. Suspected fraud, corruption, theft, double funding or fabricated evidence must be reported without undue delay.'],
  ]},
  { title: 'Article 9 - Suspension and termination', clauses: [
    ['9.1.', 'The Coordinator may suspend a payment, activity or participant where reasonably necessary to protect participants, Project quality, grant compliance, evidence or funds. Where appropriate, the Partner shall be given a reasonable period to remedy the issue.'],
    ['9.2.', 'Either Party may terminate this Agreement for a material breach that is not remedied within a reasonable written deadline. The Coordinator may terminate immediately in cases of fraud, serious safeguarding failure, violence, deliberate misuse of funds, false declarations, loss of eligibility or conduct creating a serious risk to participants or the Project.'],
    ['9.3.', 'Termination does not affect existing repayment, reporting, audit, confidentiality, data-protection, liability or indemnification obligations. The Partner shall return unspent or unsupported funds and provide all outstanding Project documents.'],
  ]},
  { title: 'Article 10 - Force majeure, disputes and applicable law', clauses: [
    ['10.1.', 'A Party is not in breach to the extent performance is prevented by an unforeseeable and unavoidable event beyond its reasonable control, provided it promptly informs the other Party and takes reasonable steps to reduce the impact. Financial eligibility remains subject to the Grant Agreement and the National Agency’s decision.'],
    ['10.2.', 'The Parties shall first attempt to resolve disputes through good-faith written consultation between their authorised representatives. If no solution is reached within fifteen business days, the matter shall be escalated to their legal representatives or governing bodies.'],
    ['10.3.', "This Agreement is governed by German law to the extent permitted by mandatory law. Where legally permissible, the courts competent for the Coordinator's registered office shall have jurisdiction."],
  ]},
  { title: 'Article 11 - Final provisions', clauses: [
    ['11.1.', 'Amendments must be made in writing and approved by authorised representatives of both Parties. If any provision is invalid or unenforceable, the remaining provisions remain effective and the Parties shall replace the affected provision with a lawful provision closest to its intended purpose.'],
    ['11.2.', 'Electronic signatures and counterparts are permitted where legally valid. The working language is English.'],
  ]},
] as const;

export function organisationPaymentDeclaration(data: Pick<SavedOrganisationDeclaration, 'totalCents' | 'projectName' | 'projectCode' | 'destinationCity' | 'activityStartDate' | 'activityEndDate'>) {
  return `I declare that a payment of ${euro(data.totalCents)} will be paid by bank transfer to the bank account above after the required participant reporting has been completed and all original travel documents for the EU project ${data.projectName} (${data.projectCode}) held in ${data.destinationCity}, between ${data.activityStartDate} and ${data.activityEndDate}, have been delivered and checked.`;
}
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

export const declarationIntro = "I declare that all information provided is true and complete, that all tickets and supporting documents are genuine, unaltered, and relate to my travel for this project, and that these expenses have not been and will not be reimbursed from any other source.";
export const declarationPoints = [
  "Authenticity of documents: If any document is found to be forged, falsified, Photoshopped, digitally manipulated, or otherwise intentionally altered, I understand that IJBK reserves the right to cancel my entire reimbursement.",
  "Data processing: I authorize IJBK to use the provided details to process my reimbursement.",
  "Deadline and incomplete claims: The claim and all required supporting documents must be submitted within 15 days of the last day of the activity. Claims submitted after this deadline cannot be reimbursed. If required documents are missing, IJBK will contact the participant once by email. If the missing documents are not provided within 14 days of that email, the claim will be closed.",
  "Reimbursement ceiling and actual costs: Reimbursement is limited to the applicable Erasmus+ distance-band amount based on the participant’s city of departure and only covers actual costs supported by the attached tickets, invoices, receipts, and other required evidence. Higher actual costs may be declared in full, but reimbursement will not exceed the applicable ceiling, and any amount above it is borne by the participant. In special cases, additional travel costs may be reimbursed by the organiser.",
  "Payment conditions: Payment will be made only after (a) the participant’s full attendance at the activity has been confirmed and (b) the agreed dissemination activities have been completed and validated by IJBK. The transfer will normally be made within two weeks of such validation.",
  "Transfer: Reimbursement will be made by SEPA transfer in EUR to the bank account stated in the claim. Any charges imposed by the receiving bank are borne by the participant."
];
export const declarationText = [declarationIntro, ...declarationPoints].join("\n\n");

export const greenTravelConfirmation = "I confirm that my entire journey to and from this activity was by car, bus, or train, without using any flight.";
export const greenTravelDeclaration = [
  "I declare that the information provided in this claim is true and accurate and that the journey declared as green travel was undertaken using car, bus, or train for the entire journey, without any flights.",
  "I understand that I may be required to provide tickets, booking confirmations, receipts or other supporting documents as evidence of the journey and means of transport used. I understand that an incorrect or false declaration may result in the corresponding green-travel reimbursement or other related travel support being refused or recovered."
];

export const legacyDeclarationText = 'I confirm that these details are accurate, these expenses were incurred for this project, and the uploaded tickets correspond to the listed journeys. I authorize IJBK to use these details to process my reimbursement.';

export const flightRoute = (ticket: Pick<TicketInput, 'from' | 'to' | 'mode' | 'journeyType'>) =>
  isReceipt(ticket) ? `${ticket.from} / ${ticket.to}` : `${ticket.from} → ${ticket.to}${ticket.mode === 'Flight' && ticket.journeyType === 'round-trip' ? ` → ${ticket.from}` : ''}`;

// A single ordered list drives storage, review, tables and PDF attachment pages.
// Boarding passes never participate in reimbursement totals.
export function supportingDocuments(claim: Pick<SavedClaim, 'tickets'>) {
  return claim.tickets.flatMap(ticket => [
    { key: `ticket-${ticket.serial}`, label: `${isReceipt(ticket) ? ticket.mode + " receipt" : "Ticket"} ${ticket.serial}`, ticket, filename: ticket.filename, from: ticket.from, to: ticket.to, route: flightRoute(ticket), amount: ticket.amount, currency: ticket.currency, euroCents: ticket.euroCents, isBoardingPass: false },
    ...(ticket.mode === 'Flight' ? ticket.boardingPasses ?? [] : []).map((pass, i) => ({
      key: `boarding-${ticket.serial}-${i + 1}`, label: `Flight ${ticket.serial} / ${pass.journey === 'return' ? 'Return' : 'Outbound'} boarding pass ${i + 1}`,
      ticket, filename: pass.filename ?? '', from: pass.from, to: pass.to, route: `${pass.from || 'Airport not recorded'} → ${pass.to || 'Airport not recorded'}`,
      amount: 0, currency: 'EUR', euroCents: 0, isBoardingPass: true,
    })),
  ]);
}

export function allGreenTransport(tickets: { mode?: string }[]): boolean {
  const transport = tickets.filter(ticket => !isReceipt(ticket));
  return transport.length > 0 && transport.every(ticket => ['Car', 'Bus', 'Train'].includes(ticket.mode ?? ''));
}

export const greenTravelCorrectionSchema = z.object({ greenTravel: z.boolean(), reason: z.string().trim().min(1, 'Enter a reason for the correction.').max(500) });
export function correctGreenTravel(claim: SavedClaim, input: z.infer<typeof greenTravelCorrectionSchema>, correctedAt: string): SavedClaim {
  if (input.greenTravel && claim.tickets.some(ticket => ticket.mode === 'Flight')) throw new Error('Green travel cannot be selected when the claim contains flights.');
  if (!input.greenTravel && claim.tickets.some(isReceipt)) throw new Error('Food and accommodation receipts require green travel. Review those expenses before changing this option.');
  if (!input.greenTravel && allGreenTransport(claim.tickets)) throw new Error('Green travel cannot be disabled when all transport is by car, bus, or train.');
  if (input.greenTravel === claim.participant.greenTravel) return claim;
  return { ...claim, participant: { ...claim.participant, greenTravel: input.greenTravel }, greenTravelCorrections: [...(claim.greenTravelCorrections ?? []), { previous: claim.participant.greenTravel, value: input.greenTravel, reason: input.reason, correctedAt }] };
}
