/**
 * Campaign endpoints. Controllers stay thin: parse the request, call a service,
 * shape the envelope. Status codes come from the thrown error types.
 */

import type { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service.js';
import { sseService, SSE_EVENTS } from '../services/sse.service.js';
import { streamLeadWorkbook } from '../utils/lead-export.js';
import { getOperatorId } from '../services/operator.js';

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

export const campaignController = {
  findAll: handle(async (req, res) => {
    const result = await campaignService.findAll(req.query as any);
    res.json({ success: true, data: result.data, meta: result.meta });
  }),

  findById: handle(async (req, res) => {
    const campaign = await campaignService.findById(req.params.id);
    res.json({ success: true, data: campaign });
  }),

  create: handle(async (req, res) => {
    const campaign = await campaignService.create({
      ...req.body,
      createdById: await getOperatorId(),
    });

    sseService.broadcast(SSE_EVENTS.CAMPAIGN_UPDATED, { campaignId: campaign.id });
    res.status(201).json({ success: true, data: campaign });
  }),

  update: handle(async (req, res) => {
    const campaign = await campaignService.update(req.params.id, req.body);
    sseService.broadcast(SSE_EVENTS.CAMPAIGN_UPDATED, { campaignId: campaign.id });
    res.json({ success: true, data: campaign });
  }),

  setStatus: handle(async (req, res) => {
    const campaign = await campaignService.setStatus(req.params.id, req.body.status);
    sseService.broadcast(SSE_EVENTS.CAMPAIGN_UPDATED, { campaignId: campaign.id });
    res.json({
      success: true,
      data: campaign,
      message:
        campaign.status === 'ACTIVE'
          ? 'Campaign resumed. Start a discovery session to collect leads.'
          : `Campaign ${campaign.status.toLowerCase()}.`,
    });
  }),

  delete: handle(async (req, res) => {
    const { deletedLeads } = await campaignService.delete(req.params.id);
    sseService.broadcast(SSE_EVENTS.CAMPAIGN_UPDATED, { campaignId: req.params.id });
    res.json({
      success: true,
      data: { deletedLeads },
      message: `Campaign deleted along with ${deletedLeads} lead${deletedLeads === 1 ? '' : 's'}.`,
    });
  }),

  getTasks: handle(async (req, res) => {
    const tasks = await campaignService.getTasks(req.params.id, req.query.sessionId as string);
    res.json({ success: true, data: tasks });
  }),

  exportLeads: handle(async (req, res) => {
    const campaign = await campaignService.findById(req.params.id);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    await streamLeadWorkbook(
      res,
      { campaignId: campaign.id, ...(status && { status }) },
      campaign.name,
    );
  }),
};
