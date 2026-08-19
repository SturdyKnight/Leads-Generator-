/**
 * Lead endpoints. Always reached with a campaign or session filter — leads have
 * no standalone browsing surface.
 */

import type { Request, Response, NextFunction } from 'express';
import { leadService } from '../services/lead.service.js';
import { outreachDraftService } from '../services/outreach-draft.service.js';
import { sseService, SSE_EVENTS } from '../services/sse.service.js';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const handle =
  (fn: Handler): Handler =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

/** Express gives a bare string for `?status=X` but an array for repeats. */
function toArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? (value as string[]) : [String(value)];
}

export const leadController = {
  findAll: handle(async (req, res) => {
    const result = await leadService.findAll({
      ...(req.query as any),
      status: toArray(req.query.status),
    });
    res.json({ success: true, data: result.data, meta: result.meta });
  }),

  findById: handle(async (req, res) => {
    const lead = await leadService.findById(req.params.id);
    res.json({ success: true, data: lead });
  }),

  updateStatus: handle(async (req, res) => {
    const lead = await leadService.updateStatus(req.params.id, req.body.status);
    sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, {
      leadId: lead.id,
      campaignId: lead.campaignId,
      status: lead.status,
    });
    res.json({ success: true, data: lead });
  }),

  addNote: handle(async (req, res) => {
    const lead = await leadService.addNote(req.params.id, req.body.note);
    sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, { leadId: lead.id, campaignId: lead.campaignId });
    res.json({ success: true, data: lead });
  }),

  delete: handle(async (req, res) => {
    await leadService.delete(req.params.id);
    sseService.broadcast(SSE_EVENTS.LEAD_UPDATED, { leadId: req.params.id });
    res.json({ success: true, data: { id: req.params.id } });
  }),

  getActivities: handle(async (req, res) => {
    const activities = await leadService.getActivities(req.params.id);
    res.json({ success: true, data: activities });
  }),

  draftOutreach: handle(async (req, res) => {
    const lead = await leadService.findById(req.params.id);
    const draft = await outreachDraftService.generate(lead.id, lead.campaignId ?? '');
    res.json({ success: true, data: draft, message: 'Outreach draft generated' });
  }),
};
