/**
 * API routes.
 *
 * There is no authentication middleware by design — B-Matrix is a single
 * operator tool. Protect the deployment at the platform layer instead.
 *
 * Route order matters in two places: literal segments (`/leads/stats`) must be
 * declared before parameterised ones (`/leads/:id`), and the nested session
 * router is mounted after the campaign router so `/campaigns/:id` cannot
 * swallow `/campaigns/:id/sessions`.
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';

import { campaignController } from '../controllers/campaign.controller.js';
import { discoverySessionController } from '../controllers/discovery-session.controller.js';
import { leadController } from '../controllers/lead.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { settingsController } from '../controllers/settings.controller.js';
import { sseService } from '../services/sse.service.js';

import { validateBody, validateQuery } from '../middleware/validator.js';
import { expensiveLimiter } from '../middleware/rate-limiter.js';
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignStatusSchema,
  campaignListQuerySchema,
  sessionCreateSchema,
  leadListQuerySchema,
  leadStatusSchema,
  leadNoteSchema,
  settingsUpdateSchema,
} from '@bmatrix/shared';

const router = Router();

/* ---------------------------------- leads --------------------------------- */

const leads = Router();
leads.get('/', validateQuery(leadListQuerySchema), leadController.findAll);
leads.get('/:id', leadController.findById);
leads.get('/:id/activities', leadController.getActivities);
leads.patch('/:id/status', validateBody(leadStatusSchema), leadController.updateStatus);
leads.post('/:id/notes', validateBody(leadNoteSchema), leadController.addNote);
leads.delete('/:id', leadController.delete);

/* -------------------------------- sessions -------------------------------- */

const sessions = Router({ mergeParams: true });
sessions.get('/', discoverySessionController.findByCampaign);
sessions.post('/', validateBody(sessionCreateSchema), discoverySessionController.create);
sessions.get('/:sessionId', discoverySessionController.findById);
sessions.get('/:sessionId/leads', discoverySessionController.getLeads);
sessions.get('/:sessionId/export', expensiveLimiter, discoverySessionController.exportLeads);
sessions.post('/:sessionId/start', expensiveLimiter, discoverySessionController.start);
sessions.post('/:sessionId/cancel', discoverySessionController.cancel);
sessions.delete('/:sessionId', discoverySessionController.delete);

/* -------------------------------- campaigns ------------------------------- */

const campaigns = Router();
campaigns.get('/', validateQuery(campaignListQuerySchema), campaignController.findAll);
campaigns.post('/', validateBody(campaignCreateSchema), campaignController.create);
campaigns.get('/:id', campaignController.findById);
campaigns.put('/:id', validateBody(campaignUpdateSchema), campaignController.update);
campaigns.patch('/:id/status', validateBody(campaignStatusSchema), campaignController.setStatus);
campaigns.get('/:id/tasks', campaignController.getTasks);
campaigns.get('/:id/export', expensiveLimiter, campaignController.exportLeads);
campaigns.delete('/:id', campaignController.delete);
campaigns.use('/:campaignId/sessions', sessions);

/* ------------------------------- dashboard -------------------------------- */

const dashboard = Router();
dashboard.get('/stats', dashboardController.getStats);
dashboard.get('/activity', dashboardController.getRecentActivity);

/* -------------------------------- settings -------------------------------- */

const settings = Router();
settings.get('/', settingsController.getAll);
settings.put('/', validateBody(settingsUpdateSchema), settingsController.update);

/* ---------------------------------- SSE ----------------------------------- */

const events = Router();
events.get('/', (_req, res) => {
  // Defensive against proxies that would otherwise buffer the stream.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  sseService.addClient(randomUUID(), res);
});

router.use('/campaigns', campaigns);
router.use('/leads', leads);
router.use('/dashboard', dashboard);
router.use('/settings', settings);
router.use('/events', events);

export default router;
