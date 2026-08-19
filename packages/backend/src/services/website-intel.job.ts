/**
 * WebsiteIntelJob — async background job that scrapes lead websites and uses
 * MiMo AI to extract useful business intelligence.
 *
 * For each lead with a website and no existing intel, it:
 * 1. Fetches the website content (head only for speed)
 * 2. Sends the HTML to MiMo for analysis
 * 3. Stores summary, detected tech stack, and contact info in LeadEnrichment
 *
 * Entirely optional — skips silently when MiMo is not configured.
 */

import { prisma } from '../config/database.js';
import { mimoProvider } from './mimo-provider.service.js';
import { settingsService } from './settings.service.js';
import { logger } from '../utils/logger.js';
import { sseService, SSE_EVENTS } from './sse.service.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_LENGTH = 15_000;

const SYSTEM_PROMPT = `You are a website analysis assistant. Given raw HTML from a business website, extract:

1. "summary": A 1-2 sentence description of what the business does
2. "tech": Array of technologies detected (e.g., WordPress, Shopify, React, Wix, Squarespace)
3. "contact": Object with any found contact info:
   - "email": string|null — any email address found
   - "phone": string|null — any phone number found
   - "address": string|null — any physical address found

Return valid JSON. If information is not found, use null for that field. Be concise.`;

interface WebsiteIntel {
  summary: string | null;
  tech: string[];
  contact: {
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

export class WebsiteIntelJob {
  /**
   * Analyze websites for all eligible leads in a session. Fire-and-forget.
   */
  async run(campaignId: string, sessionId: string): Promise<void> {
    if (!mimoProvider.isConfigured) {
      logger.debug('MiMo not configured — skipping website intel');
      return;
    }

    const settings = await settingsService.getAll();
    if (!settings.aiWebsiteIntelEnabled) {
      logger.debug('AI website intel disabled in settings — skipping');
      return;
    }

    try {
      // Find leads with websites that haven't been analyzed yet.
      const leads = await prisma.lead.findMany({
        where: {
          sessionId,
          website: { not: null },
          enrichment: { websiteIntelAt: null },
        },
        select: { id: true, name: true, website: true },
        take: 50,
      });

      if (leads.length === 0) return;

      logger.info(`Analyzing ${leads.length} websites from session ${sessionId}`);

      for (const lead of leads) {
        await this.analyzeWebsite(campaignId, lead.id, lead.name, lead.website!);
        // Small delay between requests to be polite.
        await delay(500);
      }

      logger.info(`Website intel complete for session ${sessionId}`);
    } catch (error) {
      logger.error('WebsiteIntelJob failed', { error: String(error), sessionId });
    }
  }

  private async analyzeWebsite(
    campaignId: string,
    leadId: string,
    leadName: string,
    url: string,
  ): Promise<void> {
    try {
      const html = await this.fetchWebsite(url);
      if (!html) return;

      const prompt = `Business: ${leadName}\nWebsite: ${url}\n\nHTML:\n${html}`;

      const raw = await mimoProvider.ask(prompt, SYSTEM_PROMPT, { json: true });
      const intel: WebsiteIntel = JSON.parse(raw);

      const enrichment = await prisma.leadEnrichment.upsert({
        where: { leadId },
        create: {
          leadId,
          websiteSummary: intel.summary,
          websiteTech: JSON.stringify(intel.tech),
          websiteContact: JSON.stringify(intel.contact),
          websiteIntelAt: new Date(),
        },
        update: {
          websiteSummary: intel.summary,
          websiteTech: JSON.stringify(intel.tech),
          websiteContact: JSON.stringify(intel.contact),
          websiteIntelAt: new Date(),
        },
      });

      // Link enrichment to lead if not already linked.
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { enrichmentId: true } });
      if (lead && !lead.enrichmentId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { enrichmentId: enrichment.id },
        });
      }

      sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, { leadId, campaignId });
    } catch (error) {
      logger.warn(`Website intel failed for lead ${leadId}`, { error: String(error) });
    }
  }

  private async fetchWebsite(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BMatrix-Bot/1.0' },
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const text = await response.text();
      // Truncate to avoid sending massive HTML to the AI.
      return text.length > MAX_HTML_LENGTH ? text.slice(0, MAX_HTML_LENGTH) : text;
    } catch {
      return null;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const websiteIntelJob = new WebsiteIntelJob();
