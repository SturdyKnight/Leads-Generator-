/**
 * ClassifyLeadsJob — async background job that classifies newly discovered leads
 * as chain/franchise businesses using MiMo AI.
 *
 * Runs after a discovery session completes. Processes leads in batches to stay
 * within rate limits. Results are written to LeadEnrichment and mirrored onto
 * the Lead row for fast filtering.
 *
 * Entirely optional — skips silently when MiMo is not configured.
 */

import { prisma } from '../config/database.js';
import { mimoProvider } from './mimo-provider.service.js';
import { settingsService } from './settings.service.js';
import { logger } from '../utils/logger.js';
import { sseService, SSE_EVENTS } from './sse.service.js';

const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `You are a business classification assistant. Given a list of business names and their categories, determine which ones are chains/franchises vs independent businesses.

Return a JSON object with a "results" array. Each result has:
- "name": the business name (exact match from input)
- "isChain": boolean — true if this is a chain or franchise location
- "chainName": string|null — the parent chain/brand name if isChain is true
- "outletCount": number|null — estimated number of locations (use your knowledge), null if unknown

Examples of chains: McDonald's, Starbucks, Subway, 7-Eleven, Holiday Inn, Anytime Fitness
Examples of independent: "Joe's Pizza", "Main Street Dental", "Sunshine Yoga Studio"

When unsure, default to independent (isChain: false).`;

interface ClassificationResult {
  name: string;
  isChain: boolean;
  chainName: string | null;
  outletCount: number | null;
}

export class ClassifyLeadsJob {
  /**
   * Classify all unclassified leads in a session. Fire-and-forget: never throws.
   */
  async run(campaignId: string, sessionId: string): Promise<void> {
    if (!mimoProvider.isConfigured) {
      logger.debug('MiMo not configured — skipping lead classification');
      return;
    }

    const settings = await settingsService.getAll();
    if (!settings.aiClassificationEnabled) {
      logger.debug('AI classification disabled in settings — skipping');
      return;
    }

    try {
      const leads = await prisma.lead.findMany({
        where: {
          sessionId,
          enrichmentId: null,
        },
        select: { id: true, name: true, categories: true },
        take: 200,
      });

      if (leads.length === 0) return;

      logger.info(`Classifying ${leads.length} leads from session ${sessionId}`);

      for (let i = 0; i < leads.length; i += BATCH_SIZE) {
        const batch = leads.slice(i, i + BATCH_SIZE);
        await this.classifyBatch(campaignId, batch);
      }

      logger.info(`Classification complete for session ${sessionId}`);
    } catch (error) {
      logger.error('ClassifyLeadsJob failed', { error: String(error), sessionId });
    }
  }

  private async classifyBatch(
    campaignId: string,
    batch: { id: string; name: string; categories: string }[],
  ): Promise<void> {
    const input = batch.map((l) => {
      let cats: string[] = [];
      try { cats = JSON.parse(l.categories); } catch { /* ignore */ }
      return { name: l.name, categories: cats };
    });

    const prompt = `Classify these businesses:\n\n${JSON.stringify(input, null, 2)}`;

    let results: ClassificationResult[];
    try {
      const raw = await mimoProvider.ask(prompt, SYSTEM_PROMPT, { json: true });
      const parsed = JSON.parse(raw);
      results = Array.isArray(parsed.results) ? parsed.results : [];
    } catch (error) {
      logger.warn('MiMo classification request failed', { error: String(error) });
      return;
    }

    // Match results back to leads by name (case-insensitive).
    const byName = new Map(results.map((r) => [r.name.toLowerCase(), r]));

    for (const lead of batch) {
      const match = byName.get(lead.name.toLowerCase());
      if (!match) continue;

      try {
        const enrichment = await prisma.leadEnrichment.create({
          data: {
            leadId: lead.id,
            isChain: match.isChain,
            chainName: match.chainName,
            outletCount: match.outletCount,
            classification: JSON.stringify(match),
            classifiedAt: new Date(),
          },
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            isChain: match.isChain,
            chainName: match.chainName,
            outletCount: match.outletCount,
            enrichmentId: enrichment.id,
          },
        });

        sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, { leadId: lead.id, campaignId });
      } catch (error) {
        logger.warn(`Failed to save classification for lead ${lead.id}`, {
          error: String(error),
        });
      }
    }
  }
}

export const classifyLeadsJob = new ClassifyLeadsJob();
