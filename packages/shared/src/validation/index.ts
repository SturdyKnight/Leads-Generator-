/**
 * Zod schemas shared by client forms and server middleware.
 *
 * Two rules keep these honest. Optional in the UI means optional here — the
 * previous config schema required localities while both forms labelled the
 * field optional, so the default path 400'd. And every field the UI collects
 * must be declared, because Zod strips unknown keys silently: an undeclared
 * `focusOnChains` was being dropped on its way to the database.
 */

import { z } from 'zod';
import { CAMPAIGN_STATUSES, LEAD_STATUSES } from '../types/index.js';

/* --------------------------------- shared --------------------------------- */

const nonEmptyStrings = z.array(z.string().trim().min(1));

export const campaignConfigSchema = z.object({
  city: z.string().trim().min(1, 'Enter a city to search in').max(120),
  keywords: nonEmptyStrings.min(1, 'Add at least one keyword').max(20),
  localities: nonEmptyStrings.max(20).default([]),
  maxResults: z.coerce.number().int().min(1).max(1000).default(100),
  radius: z.coerce.number().int().min(100).max(50_000).optional(),
  focusOnChains: z.boolean().default(false),
});

/* -------------------------------- campaigns ------------------------------- */

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name your campaign').max(200),
  description: z.string().trim().max(2000).optional(),
  config: campaignConfigSchema,
});

export const campaignUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    config: campaignConfigSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const campaignStatusSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES),
});

export const campaignListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.union([z.enum(CAMPAIGN_STATUSES), z.array(z.enum(CAMPAIGN_STATUSES))]).optional(),
  // Allowlisted so an arbitrary value cannot reach Prisma's orderBy.
  sortBy: z.enum(['updatedAt', 'createdAt', 'name', 'totalLeads', 'avgScore']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/* -------------------------------- sessions -------------------------------- */

export const sessionCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name this discovery run').max(200),
  config: campaignConfigSchema,
});

/* ---------------------------------- leads --------------------------------- */

export const leadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const leadNoteSchema = z.object({
  note: z.string().trim().min(1, 'Write something first').max(4000),
});

export const leadListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  campaignId: z.string().optional(),
  sessionId: z.string().optional(),
  status: z.union([z.enum(LEAD_STATUSES), z.array(z.enum(LEAD_STATUSES))]).optional(),
  minScore: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  sortBy: z.enum(['createdAt', 'score', 'name', 'rating', 'reviewCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/* -------------------------------- settings -------------------------------- */

export const settingsUpdateSchema = z
  .object({
    companyName: z.string().trim().max(200).optional(),
    timezone: z.string().trim().max(60).optional(),
    defaultCountry: z.string().trim().max(4).optional(),
    defaultMaxResults: z.coerce.number().int().min(1).max(1000).optional(),
    aiClassificationEnabled: z.boolean().optional(),
    aiWebsiteIntelEnabled: z.boolean().optional(),
    aiOutreachEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

/* ---------------------------------- types --------------------------------- */

export type CampaignConfigInput = z.infer<typeof campaignConfigSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
