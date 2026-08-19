/**
 * Domain types shared by the API and the client.
 *
 * These mirror what the API actually returns: JSON columns arrive parsed, and
 * dates arrive as ISO strings.
 */

/* ---------------------------------- API ----------------------------------- */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/* -------------------------------- Campaigns ------------------------------- */

export const CAMPAIGN_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface CampaignConfig {
  city: string;
  keywords: string[];
  localities: string[];
  maxResults: number;
  radius?: number;
  focusOnChains: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  config: CampaignConfig;
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  avgScore: number;
  startedAt: string | null;
  pausedAt: string | null;
  discoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Sessions ------------------------------- */

export const SESSION_STATUSES = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'INTERRUPTED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface DiscoverySession {
  id: string;
  campaignId: string;
  name: string;
  config: CampaignConfig;
  status: SessionStatus;
  totalLeads: number;
  error: string | null;
  discoveredAt: string | null;
  createdAt: string;
}

export const TASK_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface CampaignTask {
  id: string;
  campaignId: string;
  sessionId: string | null;
  query: string;
  status: TaskStatus;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
}

/** Live payload of the `discovery:progress` SSE event. */
export interface DiscoveryProgress {
  campaignId: string;
  sessionId: string;
  completedTasks: number;
  failedTasks: number;
  totalTasks: number;
  discoveredLeads: number;
}

/* ---------------------------------- Leads --------------------------------- */

/**
 * The sales pipeline, in order. Position in this array is meaningful — the UI
 * derives progression from the index, so never reorder it casually.
 */
export const LEAD_STATUSES = [
  'DISCOVERED',
  'QUALIFIED',
  'CONTACTED',
  'INTERESTED',
  'DEMO_SCHEDULED',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  DISCOVERED: 'Discovered',
  QUALIFIED: 'Qualified',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  DEMO_SCHEDULED: 'Demo scheduled',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

/** Statuses that end the pipeline — rendered differently from in-progress ones. */
export const LEAD_TERMINAL_STATUSES: LeadStatus[] = ['WON', 'LOST'];

export interface Lead {
  id: string;
  placeId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  locality: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  mobile: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  status: LeadStatus;
  score: number;
  source: string | null;
  notes: string | null;
  // Franchise / chain detection — null means not yet classified.
  isChain: boolean | null;
  chainName: string | null;
  outletCount: number | null;
  campaignId: string | null;
  sessionId: string | null;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEnrichment {
  id: string;
  leadId: string;
  isChain: boolean | null;
  chainName: string | null;
  outletCount: number | null;
  classification: string | null;
  classifiedAt: string | null;
  websiteSummary: string | null;
  websiteTech: string | null;
  websiteContact: string | null;
  websiteIntelAt: string | null;
  outreachDraft: string | null;
  outreachDraftAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail extends Lead {
  campaign: { id: string; name: string } | null;
  session: { id: string; name: string } | null;
  enrichment: LeadEnrichment | null;
  logs: LeadActivity[];
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'created' | 'status_change' | 'note_added' | 'contacted';
  message: string;
  metadata: string | null;
  createdAt: string;
}

/* -------------------------------- Dashboard ------------------------------- */

export interface DashboardStats {
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  contactedLeads: number;
  wonLeads: number;
  conversionRate: number;
  averageScore: number;
  newThisWeek: number;
  leadsByStatus: Record<string, number>;
}

export interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    status: LeadStatus;
    campaign: { id: string; name: string } | null;
  } | null;
}

/* -------------------------------- Settings -------------------------------- */

export interface Settings {
  companyName: string;
  timezone: string;
  defaultCountry: string;
  defaultMaxResults: number;
  aiClassificationEnabled: boolean;
  aiWebsiteIntelEnabled: boolean;
  aiOutreachEnabled: boolean;
}
