/**
 * Discovery session endpoints.
 *
 * `start` returns as soon as the run is accepted — a full run takes minutes and
 * must not hold the request open. Progress reaches the client over SSE, and the
 * run itself writes its own terminal status, so a rejected promise here only
 * needs logging.
 */

import type { Request, Response, NextFunction } from 'express';
import { discoverySessionService } from '../services/discovery-session.service.js';
import { leadService } from '../services/lead.service.js';
import { streamLeadWorkbook } from '../utils/lead-export.js';
import { logger } from '../utils/logger.js';

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

export const discoverySessionController = {
  create: handle(async (req, res) => {
    const session = await discoverySessionService.create(req.params.campaignId, req.body);
    res.status(201).json({ success: true, data: session });
  }),

  findByCampaign: handle(async (req, res) => {
    const sessions = await discoverySessionService.findByCampaign(req.params.campaignId);
    res.json({ success: true, data: sessions });
  }),

  findById: handle(async (req, res) => {
    const session = await discoverySessionService.findById(req.params.sessionId);
    res.json({ success: true, data: session });
  }),

  getLeads: handle(async (req, res) => {
    const result = await leadService.findAll({
      ...(req.query as any),
      sessionId: req.params.sessionId,
    });
    res.json({ success: true, data: result.data, meta: result.meta });
  }),

  start: handle(async (req, res) => {
    const { sessionId } = req.params;

    // Surfaces "already running" / "not found" synchronously before responding.
    await discoverySessionService.findById(sessionId);

    void discoverySessionService.startDiscovery(sessionId).catch((error) => {
      logger.error(`Discovery run ${sessionId} ended with an unhandled error`, {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    res.status(202).json({
      success: true,
      data: { sessionId, status: 'RUNNING' },
      message: 'Discovery started. Progress updates arrive live.',
    });
  }),

  cancel: handle(async (req, res) => {
    const result = await discoverySessionService.cancel(req.params.sessionId);
    res.json({ success: true, data: result, message: 'Stopping after the current search.' });
  }),

  delete: handle(async (req, res) => {
    const { deletedLeads } = await discoverySessionService.delete(req.params.sessionId);
    res.json({
      success: true,
      data: { deletedLeads },
      message: `Session deleted along with ${deletedLeads} lead${deletedLeads === 1 ? '' : 's'}.`,
    });
  }),

  exportLeads: handle(async (req, res) => {
    const session = await discoverySessionService.findById(req.params.sessionId);
    await streamLeadWorkbook(res, { sessionId: session.id }, session.name);
  }),
};
