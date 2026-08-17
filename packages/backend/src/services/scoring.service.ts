/**
 * Lead scoring, 0–100.
 *
 * Scored purely on what Google Places actually returns. The previous model
 * reserved 30 points for an email address and a multi-store flag, neither of
 * which Places provides and nothing else populated — so no lead could exceed 85
 * and scores bunched into a narrow band. These weights spread across the signals
 * that genuinely vary between businesses.
 */

export interface ScorableLead {
  rating?: number | null;
  reviewCount?: number | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  categories?: string[] | string | null;
}

/** Reachability is what makes a lead actionable, so it carries the most weight. */
const WEIGHT_PHONE = 25;
const WEIGHT_WEBSITE = 20;
const WEIGHT_RATING = 25;
const WEIGHT_REVIEWS = 20;
const WEIGHT_COMPLETENESS = 10;

export class ScoringService {
  calculateScore(lead: ScorableLead): number {
    let score = 0;

    if (lead.phone) score += WEIGHT_PHONE;
    if (lead.website) score += WEIGHT_WEBSITE;

    // A 3.0 rating is the neutral point; below it contributes nothing.
    if (lead.rating && lead.rating > 3) {
      score += Math.round(((lead.rating - 3) / 2) * WEIGHT_RATING);
    }

    // Review volume as a proxy for how established the business is.
    if (lead.reviewCount) {
      if (lead.reviewCount >= 500) score += WEIGHT_REVIEWS;
      else if (lead.reviewCount >= 200) score += 16;
      else if (lead.reviewCount >= 50) score += 12;
      else if (lead.reviewCount >= 10) score += 7;
      else score += 3;
    }

    const categories = parseCategories(lead.categories);
    if (lead.address && lead.city && categories.length > 0) score += WEIGHT_COMPLETENESS;

    return Math.min(100, score);
  }
}

function parseCategories(value: ScorableLead['categories']): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const scoringService = new ScoringService();
