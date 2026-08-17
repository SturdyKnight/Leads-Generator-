/**
 * The single source of truth for how pipeline state looks.
 *
 * Three maps used to exist for this, so the same status rendered in different
 * colours on different pages. The pipeline is also *ordinal* — a lead in
 * Negotiation is further along than one in Contacted — so the in-progress
 * stages share one hue and deepen as they advance. Only the two terminal
 * outcomes get a distinct colour, because they are the ones worth noticing.
 *
 * Every pairing below clears 4.5:1 against its own background.
 */

import { LEAD_STATUSES, type LeadStatus, type SessionStatus } from '@bmatrix/shared';

export interface StatusTone {
  /** Chip: tinted background with dark text. */
  chip: string;
  /** Bare dot, for dense rows where a chip would be too heavy. */
  dot: string;
}

const PIPELINE_TONES: Record<LeadStatus, StatusTone> = {
  // Untouched: neutral, because nothing has happened to it yet.
  DISCOVERED: { chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  // In progress: one hue, deepening with every stage. Read down the dot column
  // and the pipeline order is visible without reading a single word.
  QUALIFIED: { chip: 'bg-accent-50 text-accent-700', dot: 'bg-accent-300' },
  CONTACTED: { chip: 'bg-accent-50 text-accent-700', dot: 'bg-accent-500' },
  INTERESTED: { chip: 'bg-accent-100 text-accent-700', dot: 'bg-accent-600' },
  DEMO_SCHEDULED: { chip: 'bg-accent-100 text-accent-800', dot: 'bg-accent-700' },
  NEGOTIATION: { chip: 'bg-accent-200 text-accent-900', dot: 'bg-accent-800' },
  // Terminal: the only two stages that leave the hue, because they are the two
  // worth spotting from across the list.
  WON: { chip: 'bg-positive-50 text-positive-700', dot: 'bg-positive-600' },
  LOST: { chip: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
};

export function leadStatusTone(status: string): StatusTone {
  return PIPELINE_TONES[status as LeadStatus] ?? PIPELINE_TONES.DISCOVERED;
}

/** Position in the pipeline, 0–1. Drives progress bars and ordering. */
export function pipelineProgress(status: string): number {
  const index = LEAD_STATUSES.indexOf(status as LeadStatus);
  if (index < 0) return 0;
  return index / (LEAD_STATUSES.length - 1);
}

const SESSION_TONES: Record<SessionStatus, StatusTone> = {
  PENDING: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  RUNNING: { chip: 'bg-accent-50 text-accent-700', dot: 'bg-accent-600' },
  COMPLETED: { chip: 'bg-positive-50 text-positive-700', dot: 'bg-positive-600' },
  FAILED: { chip: 'bg-critical-50 text-critical-700', dot: 'bg-critical-600' },
  CANCELLED: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  INTERRUPTED: { chip: 'bg-caution-50 text-caution-700', dot: 'bg-caution-600' },
};

export function sessionStatusTone(status: string): StatusTone {
  return SESSION_TONES[status as SessionStatus] ?? SESSION_TONES.PENDING;
}

const CAMPAIGN_TONES: Record<string, StatusTone> = {
  ACTIVE: { chip: 'bg-positive-50 text-positive-700', dot: 'bg-positive-600' },
  PAUSED: { chip: 'bg-caution-50 text-caution-700', dot: 'bg-caution-600' },
  ARCHIVED: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

export function campaignStatusTone(status: string): StatusTone {
  return CAMPAIGN_TONES[status] ?? CAMPAIGN_TONES.ARCHIVED;
}

/** DEMO_SCHEDULED → "Demo scheduled". */
export function humanizeStatus(status: string): string {
  const lower = status.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Score bands, used for the lead score readout. */
export function scoreTone(score: number): string {
  if (score >= 70) return 'text-positive-700';
  if (score >= 40) return 'text-slate-700';
  return 'text-slate-400';
}
