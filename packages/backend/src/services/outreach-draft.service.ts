/**
 * Outreach draft generation — uses MiMo AI to draft a personalized outreach
 * message for a lead based on their business info and enrichment data.
 *
 * Generated on demand (not automatically), stored in LeadEnrichment.
 */

import { prisma } from '../config/database.js';
import { mimoProvider } from './mimo-provider.service.js';
import { settingsService } from './settings.service.js';
import { NotFoundError, ExternalServiceError } from '../utils/errors.js';
import { sseService, SSE_EVENTS } from './sse.service.js';

const SYSTEM_PROMPT = `You are a B2B outreach copywriter. Write a short, professional, personalized cold outreach email for a lead.

Rules:
- Keep it under 150 words
- Reference the business by name
- Mention something specific (their category, location, or website info if available)
- Be direct about the value proposition — no fluff
- End with a clear call to action
- Use a friendly but professional tone
- Do NOT use generic templates — make each one feel personal

Return a JSON object with:
- "subject": email subject line
- "body": the email body (plain text, no markdown)`;

export class OutreachDraftService {
  async generate(leadId: string, campaignId: string): Promise<{ subject: string; body: string }> {
    if (!mimoProvider.isConfigured) {
      throw new ExternalServiceError('MiMo AI is not configured. Set MIMO_API_KEY.');
    }

    const settings = await settingsService.getAll();
    if (!settings.aiOutreachEnabled) {
      throw new ExternalServiceError('AI outreach is disabled in settings.');
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { enrichment: true },
    });

    if (!lead) throw new NotFoundError('Lead', leadId);

    const context = [
      `Business: ${lead.name}`,
      lead.categories && `Categories: ${lead.categories}`,
      lead.city && `Location: ${lead.city}, ${lead.state ?? ''}`.trim(),
      lead.website && `Website: ${lead.website}`,
      lead.phone && `Phone: ${lead.phone}`,
      lead.enrichment?.websiteSummary && `About their website: ${lead.enrichment.websiteSummary}`,
      lead.enrichment?.isChain ? `This is a chain/franchise: ${lead.enrichment.chainName}` : 'This is an independent business',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Draft an outreach email for this lead:\n\n${context}`;

    const raw = await mimoProvider.ask(prompt, SYSTEM_PROMPT, { json: true });
    const draft = JSON.parse(raw) as { subject: string; body: string };

    // Store in enrichment.
    const enrichment = await prisma.leadEnrichment.upsert({
      where: { leadId },
      create: {
        leadId,
        outreachDraft: JSON.stringify(draft),
        outreachDraftAt: new Date(),
      },
      update: {
        outreachDraft: JSON.stringify(draft),
        outreachDraftAt: new Date(),
      },
    });

    // Link enrichment to lead if not already linked.
    if (!lead.enrichmentId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { enrichmentId: enrichment.id },
      });
    }

    sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, { leadId, campaignId });

    return draft;
  }
}

export const outreachDraftService = new OutreachDraftService();
