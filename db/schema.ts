import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projectSettings = sqliteTable('project_settings', {
  projectId: text('project_id').primaryKey(), projectCode: text('project_code').notNull(),
  countries: text('countries').notNull(), accessHash: text('access_hash'), organisationAccessHash: text('organisation_access_hash'), enabled: integer('enabled').notNull().default(0),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(), role: text('role').notNull(), projectId: text('project_id'), expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_sessions_project').on(table.projectId)]);
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), projectId: text('project_id').notNull(), requestId: text('request_id').notNull(),
  sessionHash: text('session_hash').notNull(), status: text('status').notNull().default('processing'),
  name: text('name').notNull(), team: text('team').notNull(), email: text('email').notNull(),
  totalCents: integer('total_cents').notNull(), data: text('data').notNull(), pdfKey: text('pdf_key').notNull(), createdAt: text('created_at').notNull(),
}, table => [index('idx_submissions_project_created').on(table.projectId, table.createdAt), uniqueIndex('idx_submissions_request').on(table.projectId, table.requestId)]);
export const rateCache = sqliteTable('rate_cache', {
  key: text('key').primaryKey(), rate: real('rate').notNull(), rateDate: text('rate_date').notNull(), source: text('source').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});

export const projectDetails = sqliteTable('project_details', {
  projectId: text('project_id').primaryKey(), data: text('data').notNull(),
});

export const organisationDeclarations = sqliteTable('organisation_declarations', {
  id: text('id').primaryKey(), projectId: text('project_id').notNull(), country: text('country').notNull(),
  organisationName: text('organisation_name').notNull(), legalRepresentativeName: text('legal_representative_name').notNull(),
  totalCents: integer('total_cents').notNull(), data: text('data').notNull(), createdAt: text('created_at').notNull(),
}, table => [uniqueIndex('idx_organisation_declarations_project_country').on(table.projectId, table.country)]);

export const driveProjects = sqliteTable('drive_projects', {
  projectId: text('project_id').primaryKey(), countriesFolderId: text('countries_folder_id').notNull().unique(),
});
export const driveParticipants = sqliteTable('drive_participants', {
  folderId: text('folder_id').primaryKey(), projectId: text('project_id').notNull(), countryId: text('country_id').notNull(),
  country: text('country').notNull(), name: text('name').notNull(), email: text('email').notNull().default(''), status: text('status').notNull().default('Needs privacy setup'),
}, table => [uniqueIndex('drive_participant_identity').on(table.projectId, table.countryId, table.email).where(sql`${table.email} <> ''`)]);
export const driveLocks = sqliteTable('drive_locks', {
  lockKey: text('lock_key').primaryKey(), token: text('token').notNull(), expiresAt: integer('expires_at').notNull(),
});
