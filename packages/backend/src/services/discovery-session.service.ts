/**
 * Discovery sessions — one discovery run inside a campaign.
 *
 * A run is a long, interruptible loop over generated search queries. Three
 * things follow from that and drive the design here:
 *
 *  - Every exit path must write a terminal status. A session left RUNNING is
 *    unrecoverable from the UI, so the run is wrapped in try/finally and the
 *    process sweeps stale sessions on boot.
 *  - Tasks are scoped by sessionId. Cleanup that matched on campaignId alone
 *    used to cancel a sibling session's pending work.
 *  - One bad lead must not kill the run. A duplicate or a failed enrichment is
 *    counted and skipped, not thrown.
 */

import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { googlePlacesService, type LocationBias } from './google-places.service.js';
import { scoringService } from './scoring.service.js';
import { campaignService } from './campaign.service.js';
import { sseService, SSE_EVENTS } from './sse.service.js';
import { getOperatorId } from './operator.js';
import { logger } from '../utils/logger.js';

export interface SessionConfig {
  city: string;
  keywords: string[];
  localities?: string[];
  maxResults?: number;
  radius?: number;
  focusOnChains?: boolean;
}

const CHAIN_QUERY_PREFIXES = ['chain', 'franchise', 'outlet'];
const DEFAULT_MAX_RESULTS = 100;

/** Sessions currently running in this process, so they can be cancelled. */
const cancelled = new Set<string>();

export class DiscoverySessionService {
  /**
   * Mark sessions left RUNNING by a previous process as interrupted. Called once
   * at boot — without it a crash mid-discovery strands a session forever.
   */
  async recoverInterruptedSessions(): Promise<number> {
    const { count } = await prisma.discoverySession.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'INTERRUPTED', error: 'Server restarted while this run was in progress.' },
    });

    if (count > 0) {
      await prisma.campaignTask.updateMany({
        where: { status: { in: ['PENDING', 'RUNNING'] } },
        data: { status: 'SKIPPED' },
      });
      logger.warn(`Recovered ${count} interrupted discovery session(s)`);
    }

    return count;
  }

  async create(campaignId: string, data: { name: string; config: SessionConfig }) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError('Campaign', campaignId);

    const session = await prisma.discoverySession.create({
      data: {
        campaignId,
        name: data.name,
        config: JSON.stringify(data.config),
        status: 'PENDING',
      },
    });

    sseService.broadcast(SSE_EVENTS.SESSION_UPDATED, { campaignId, sessionId: session.id });
    return parseSession(session);
  }

  async findByCampaign(campaignId: string) {
    const sessions = await prisma.discoverySession.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map(parseSession);
  }

  async findById(sessionId: string) {
    const session = await prisma.discoverySession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Discovery session', sessionId);
    return parseSession(session);
  }

  async delete(sessionId: string) {
    const session = await prisma.discoverySession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Discovery session', sessionId);

    if (session.status === 'RUNNING') {
      throw new ConflictError('Cancel this run before deleting the session.');
    }

    const { count } = await prisma.lead.deleteMany({ where: { sessionId } });
    await prisma.discoverySession.delete({ where: { id: sessionId } });
    await campaignService.recomputeStats(session.campaignId);

    sseService.broadcast(SSE_EVENTS.CAMPAIGN_UPDATED, { campaignId: session.campaignId });
    return { deletedLeads: count };
  }

  /** Request cancellation. The run loop checks this between queries. */
  async cancel(sessionId: string) {
    const session = await prisma.discoverySession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Discovery session', sessionId);

    if (session.status !== 'RUNNING') {
      throw new ConflictError(`This session is ${session.status.toLowerCase()}, not running.`);
    }

    cancelled.add(sessionId);
    logger.info(`Cancellation requested for session ${sessionId}`);
    return { cancelling: true };
  }

  /**
   * Run discovery. Resolves when the run reaches a terminal state; callers that
   * want a non-blocking start should not await it, but must handle rejection.
   */
  async startDiscovery(sessionId: string): Promise<{ discovered: number }> {
    const session = await prisma.discoverySession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Discovery session', sessionId);

    if (session.status === 'RUNNING') {
      throw new ConflictError('This session is already running.');
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: session.campaignId } });
    if (!campaign) throw new NotFoundError('Campaign', session.campaignId);

    const config = JSON.parse(session.config) as SessionConfig;
    const campaignId = session.campaignId;
    const maxResults = config.maxResults ?? DEFAULT_MAX_RESULTS;

    cancelled.delete(sessionId);

    // Clear any tasks from a previous attempt so re-running starts clean.
    await prisma.campaignTask.deleteMany({ where: { sessionId } });
    await prisma.discoverySession.update({
      where: { id: sessionId },
      data: { status: 'RUNNING', error: null },
    });
    this.broadcastSession(campaignId, sessionId, 'RUNNING');

    let discovered = 0;
    let completed = 0;
    let failed = 0;
    let terminalStatus = 'COMPLETED';
    let terminalError: string | null = null;

    try {
      const queries = buildQueries(config);
      logger.info(`Session ${sessionId}: ${queries.length} queries, max ${maxResults} leads`);

      const tasks = await prisma.campaignTask.createManyAndReturn({
        data: queries.map((query) => ({ campaignId, sessionId, type: 'TEXT_SEARCH', query })),
      });

      const locationBias = await this.resolveLocationBias(config);

      for (const task of tasks) {
        if (cancelled.has(sessionId)) {
          terminalStatus = 'CANCELLED';
          terminalError = 'Cancelled by user.';
          break;
        }
        if (discovered >= maxResults) break;

        try {
          const found = await this.runTask(task, {
            campaignId,
            sessionId,
            sessionName: session.name,
            locationBias,
            remaining: maxResults - discovered,
          });

          discovered += found;
          completed++;
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : String(error);
          await prisma.campaignTask.update({
            where: { id: task.id },
            data: { status: 'FAILED', error: message, processedAt: new Date() },
          });
          logger.error(`Task ${task.id} failed`, { query: task.query, error: message });
        }

        sseService.broadcast(SSE_EVENTS.DISCOVERY_PROGRESS, {
          campaignId,
          sessionId,
          completedTasks: completed,
          failedTasks: failed,
          totalTasks: tasks.length,
          discoveredLeads: discovered,
        });
      }

      // Anything still pending was cut short by maxResults or cancellation.
      await prisma.campaignTask.updateMany({
        where: { sessionId, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      });

      if (terminalStatus === 'COMPLETED' && failed > 0 && completed === 0) {
        terminalStatus = 'FAILED';
        terminalError = `All ${failed} searches failed. Check the API key and quota.`;
      }
    } catch (error) {
      terminalStatus = 'FAILED';
      terminalError = error instanceof Error ? error.message : String(error);
      logger.error(`Session ${sessionId} failed`, { error: terminalError });
    } finally {
      cancelled.delete(sessionId);

      await prisma.discoverySession.update({
        where: { id: sessionId },
        data: {
          status: terminalStatus,
          error: terminalError,
          totalLeads: discovered,
          discoveredAt: new Date(),
        },
      });

      await campaignService.recomputeStats(campaignId);
      this.broadcastSession(campaignId, sessionId, terminalStatus);
      sseService.broadcast(SSE_EVENTS.DISCOVERY_COMPLETE, {
        campaignId,
        sessionId,
        status: terminalStatus,
        discovered,
      });

      logger.info(`Session ${sessionId} ${terminalStatus}: ${discovered} leads`);
    }

    return { discovered };
  }

  /** Search, dedupe against the campaign, enrich, and persist. Returns new lead count. */
  private async runTask(
    task: { id: string; query: string },
    ctx: {
      campaignId: string;
      sessionId: string;
      sessionName: string;
      locationBias?: LocationBias;
      remaining: number;
    },
  ): Promise<number> {
    const createdById = await getOperatorId();

    await prisma.campaignTask.update({
      where: { id: task.id },
      data: { status: 'RUNNING', attempts: { increment: 1 } },
    });

    const found = await googlePlacesService.searchTextIdsOnly(task.query, ctx.locationBias);

    // Dedupe within the campaign — the unique index is [campaignId, placeId].
    const existing = await prisma.lead.findMany({
      where: { campaignId: ctx.campaignId, placeId: { in: found.map((r) => r.placeId) } },
      select: { placeId: true },
    });
    const known = new Set(existing.map((l) => l.placeId));

    const newIds = found.filter((r) => !known.has(r.placeId)).slice(0, ctx.remaining);
    let created = 0;

    if (newIds.length > 0) {
      const details = await googlePlacesService.enrichPlaceIds(newIds.map((r) => r.placeId));
      const isChainQuery = CHAIN_QUERY_PREFIXES.some((p) => task.query.toLowerCase().startsWith(p));

      for (const { placeId } of newIds) {
        const detail = details.get(placeId);
        if (!detail) continue;

        try {
          const lead = await prisma.lead.create({
            data: {
              placeId: detail.placeId,
              name: detail.name,
              address: detail.address,
              city: detail.city,
              state: detail.state,
              country: detail.country,
              locality: detail.locality,
              phone: detail.phone,
              website: detail.website,
              rating: detail.rating,
              reviewCount: detail.reviewCount,
              categories: JSON.stringify(detail.categories),
              score: scoringService.calculateScore(detail),
              source: isChainQuery ? 'chain_franchise' : 'google_places',
              campaignId: ctx.campaignId,
              sessionId: ctx.sessionId,
              createdById,
              logs: {
                create: {
                  type: 'created',
                  message: `Discovered in "${ctx.sessionName}"`,
                  metadata: JSON.stringify({ query: task.query }),
                },
              },
            },
          });

          created++;
          sseService.broadcast(SSE_EVENTS.LEAD_CREATED, {
            campaignId: ctx.campaignId,
            sessionId: ctx.sessionId,
            leadId: lead.id,
            name: lead.name,
          });
        } catch (error) {
          // A concurrent run may have inserted the same place first. Skip it.
          if (isUniqueViolation(error)) continue;
          throw error;
        }
      }
    }

    await prisma.campaignTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        result: JSON.stringify({ found: found.length, new: newIds.length, created }),
      },
    });

    return created;
  }

  private async resolveLocationBias(config: SessionConfig): Promise<LocationBias | undefined> {
    if (!config.radius || !config.city) return undefined;

    const location = await googlePlacesService.geocode(config.city);
    if (!location) {
      logger.warn(`Could not geocode "${config.city}" — radius will be ignored`);
      return undefined;
    }

    return { ...location, radiusMeters: config.radius };
  }

  private broadcastSession(campaignId: string, sessionId: string, status: string): void {
    sseService.broadcast(SSE_EVENTS.SESSION_UPDATED, { campaignId, sessionId, status });
  }
}

/**
 * Build the search queries for a run: one per keyword/locality pair, plus
 * chain-oriented variants when the campaign is hunting multi-outlet businesses.
 */
function buildQueries(config: SessionConfig): string[] {
  const localities = (config.localities ?? []).filter(Boolean);

  const base = localities.length
    ? localities.flatMap((locality) =>
        config.keywords.map((keyword) => `${keyword} in ${locality}, ${config.city}`),
      )
    : config.keywords.map((keyword) => `${keyword} in ${config.city}`);

  if (!config.focusOnChains) return base;

  return [...base, ...CHAIN_QUERY_PREFIXES.flatMap((prefix) => base.map((q) => `${prefix} ${q}`))];
}

function parseSession<T extends { config: string }>(session: T) {
  return { ...session, config: JSON.parse(session.config) as SessionConfig };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export const discoverySessionService = new DiscoverySessionService();
