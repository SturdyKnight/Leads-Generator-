/**
 * Campaigns. Statuses are ACTIVE | PAUSED | ARCHIVED.
 *
 * The totalLeads / leadsByStatus / avgScore columns are denormalized and
 * recomputed by `recomputeStats` on write only. Reads never recompute — a GET
 * that writes turns a polled detail page into a write storm.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import {
  parsePagination,
  getSkipTake,
  createPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';

export const CAMPAIGN_SORT_FIELDS = ['updatedAt', 'createdAt', 'name', 'totalLeads', 'avgScore'] as const;
export type CampaignSortField = (typeof CAMPAIGN_SORT_FIELDS)[number];

interface CampaignQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string | string[];
  sortBy?: CampaignSortField;
  sortOrder?: 'asc' | 'desc';
}

export class CampaignService {
  async findAll(query: CampaignQuery): Promise<PaginatedResult<any>> {
    const pagination = parsePagination(query);
    const { skip, take } = getSkipTake(pagination.page, pagination.limit);

    const where: Prisma.CampaignWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      if (statuses.length) where.status = { in: statuses };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'updatedAt']: query.sortOrder ?? 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    return createPaginatedResponse(campaigns.map(parseCampaign), total, pagination);
  }

  async findById(id: string) {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    return parseCampaign(campaign);
  }

  async create(data: { name: string; description?: string; config: unknown; createdById: string }) {
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        config: JSON.stringify(data.config),
        createdById: data.createdById,
      },
    });

    return parseCampaign(campaign);
  }

  async update(id: string, data: { name?: string; description?: string; config?: unknown }) {
    await this.assertExists(id);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.config !== undefined && { config: JSON.stringify(data.config) }),
      },
    });

    return parseCampaign(campaign);
  }

  async setStatus(id: string, next: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
    const campaign = await this.assertExists(id);

    if (campaign.status === next) {
      throw new ConflictError(`This campaign is already ${next.toLowerCase()}.`);
    }

    const timestamps: Record<string, Prisma.CampaignUpdateInput> = {
      ACTIVE: { startedAt: new Date() },
      PAUSED: { pausedAt: new Date() },
      ARCHIVED: {},
    };

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: next, ...timestamps[next] },
    });

    return parseCampaign(updated);
  }

  async delete(id: string): Promise<{ deletedLeads: number }> {
    const campaign = await this.assertExists(id);

    if (campaign.status === 'ACTIVE') {
      throw new ConflictError('Pause or archive this campaign before deleting it.');
    }

    const running = await prisma.discoverySession.count({
      where: { campaignId: id, status: 'RUNNING' },
    });
    if (running > 0) {
      throw new ConflictError('A discovery run is still in progress. Cancel it first.');
    }

    // Leads, sessions, and tasks cascade from the campaign.
    const deletedLeads = await prisma.lead.count({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    return { deletedLeads };
  }

  async getTasks(id: string, sessionId?: string) {
    await this.assertExists(id);

    return prisma.campaignTask.findMany({
      where: { campaignId: id, ...(sessionId && { sessionId }) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Recompute the denormalized stat columns from the leads table.
   * Call after any write that changes a campaign's lead set or statuses.
   */
  async recomputeStats(campaignId: string): Promise<void> {
    const [grouped, aggregate] = await Promise.all([
      prisma.lead.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } }),
      prisma.lead.aggregate({ where: { campaignId }, _avg: { score: true }, _count: { _all: true } }),
    ]);

    const leadsByStatus = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        leadsByStatus: JSON.stringify(leadsByStatus),
        totalLeads: aggregate._count._all,
        avgScore: Math.round((aggregate._avg.score ?? 0) * 10) / 10,
      },
    });
  }

  private async assertExists(id: string) {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    return campaign;
  }
}

function parseCampaign<T extends { config: string; leadsByStatus: string }>(campaign: T) {
  return {
    ...campaign,
    config: safeParse(campaign.config, {}),
    leadsByStatus: safeParse<Record<string, number>>(campaign.leadsByStatus, {}),
  };
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const campaignService = new CampaignService();
