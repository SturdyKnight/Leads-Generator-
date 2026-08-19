/**
 * Colour tokens for StatusPill.
 *
 * Static lookup — never build class names by string interpolation. Each entry
 * carries every Tailwind utility the pill needs as a pre-built string, so
 * PurgeCSS sees them at build time and nothing is constructed at runtime.
 *
 * The palette here is distinct from the pipeline tones in `status.ts`:
 * those use the project's custom accent ramp; these use the spec's
 * low-saturation status colours against a neutral page.
 */

import type { LeadStatus } from '@bmatrix/shared';

export interface StatusPillToken {
  /** Background + text utilities. */
  base: string;
  /** Border utility (text colour at ~20% opacity). */
  border: string;
  /** Hover background — one shade darker than `base`. */
  hover: string;
}

/**
 * Every canonical lead status. Unknown values fall back to the neutral
 * entry at render time (see StatusPill), so this map is intentionally
 * exhaustive for the statuses that exist today.
 */
export const STATUS_PILL_TOKENS: Record<LeadStatus, StatusPillToken> = {
  DISCOVERED: {
    base: 'bg-[#F1F5F9] text-[#475569]',
    border: 'border-[#475569]/20',
    hover: 'hover:bg-[#E2E8F0]',
  },
  QUALIFIED: {
    base: 'bg-purple-100 text-purple-700',
    border: 'border-purple-700/20',
    hover: 'hover:bg-purple-200',
  },
  CONTACTED: {
    base: 'bg-sky-100 text-sky-700',
    border: 'border-sky-700/20',
    hover: 'hover:bg-sky-200',
  },
  INTERESTED: {
    base: 'bg-amber-100 text-amber-700',
    border: 'border-amber-700/20',
    hover: 'hover:bg-amber-200',
  },
  DEMO_SCHEDULED: {
    base: 'bg-[#FFEDD5] text-[#C2410C]',
    border: 'border-[#C2410C]/20',
    hover: 'hover:bg-[#FED7AA]',
  },
  NEGOTIATION: {
    base: 'bg-[#FCE7F3] text-[#BE185D]',
    border: 'border-[#BE185D]/20',
    hover: 'hover:bg-[#FBCFE8]',
  },
  WON: {
    base: 'bg-green-100 text-green-700',
    border: 'border-green-700/20',
    hover: 'hover:bg-green-200',
  },
  LOST: {
    base: 'bg-red-100 text-red-700',
    border: 'border-red-700/20',
    hover: 'hover:bg-red-200',
  },
};

/** Neutral fallback used when the status value is unknown or absent. */
export const NEUTRAL_PILL_TOKEN: StatusPillToken = {
  base: 'bg-[#F1F5F9] text-[#475569]',
  border: 'border-[#475569]/20',
  hover: 'hover:bg-[#E2E8F0]',
};
