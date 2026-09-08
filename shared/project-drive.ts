import { z } from 'zod';
export type DriveParticipant = { folderId: string; countryId: string; country: string; name: string; email: string; status: string; existingEmails: string[] };
export type DriveDashboard = { configured: boolean; connected: boolean; countriesFolderId: string; countriesFolderName?: string; projectFolder?: { id: string; name: string }; participants: DriveParticipant[]; countries: { id: string; name: string }[] };
export const drivePersonSchema = z.object({ folderId: z.string().regex(/^[\w-]+$/).optional(), country: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(254).transform(v => v.toLowerCase()).or(z.literal('')) });
export type DrivePersonInput = z.infer<typeof drivePersonSchema>;
