/**
 * Leads. Always scoped to a campaign — there is no global leads surface.
 *
 * Status changes and notes append to the LeadActivity timeline, and any write
 * that can change a campaign's counts triggers a stats recompute.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import {
  parsePagination,
  getSkipTake,
  createPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import { campaignService } from './campaign.service.js';

export const LEAD_SORT_FIELDS = ['createdAt', 'score', 'name', 'rating', 'reviewCount'] as const;
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];

interface LeadQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string[];
  campaignId?: string;
  sessionId?: string;
  minScore?: string;
  city?: string;
  source?: string;
  sortBy?: LeadSortField;
  sortOrder?: 'asc' | 'desc';
}

export class LeadService {
  async findAll(query: LeadQuery): Promise<PaginatedResult<any>> {
    const pagination = parsePagination(query);
    const { skip, take } = getSkipTake(pagination.page, pagination.limit);

    const where: Prisma.LeadWhereInput = {};

    if (query.campaignId) where.campaignId = query.campaignId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.status?.length) where.status = { in: query.status };
    if (query.source) where.source = query.source;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.minScore) where.score = { gte: Number(query.minScore) };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    return createPaginatedResponse(leads.map(parseLead), total, pagination);
  }

  async findById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true } },
        session: { select: { id: true, name: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!lead) throw new NotFoundError('Lead', id);
    return parseLead(lead);
  }

  async updateStatus(id: string, status: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError('Lead', id);

    if (lead.status === status) return parseLead(lead);

    // First move into CONTACTED stamps the contact time.
    const contactedAt = status === 'CONTACTED' && !lead.contactedAt ? new Date() : undefined;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status,
        ...(contactedAt && { contactedAt }),
        logs: {
          create: {
            type: 'status_change',
            message: `${formatStatus(lead.status)} → ${formatStatus(status)}`,
            metadata: JSON.stringify({ from: lead.status, to: status }),
          },
        },
      },
    });

    if (lead.campaignId) await campaignService.recomputeStats(lead.campaignId);

    return parseLead(updated);
  }

  /** Appends to the notes field — earlier notes are never discarded. */
  async addNote(id: string, note: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError('Lead', id);

    const stamp = new Date().toISOString().slice(0, 10);
    const entry = `[${stamp}] ${note}`;
    const notes = lead.notes ? `${lead.notes}\n\n${entry}` : entry;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        notes,
        logs: { create: { type: 'note_added', message: note } },
      },
    });

    return parseLead(updated);
  }

  async delete(id: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError('Lead', id);

    await prisma.lead.delete({ where: { id } });
    if (lead.campaignId) await campaignService.recomputeStats(lead.campaignId);
  }

  async getActivities(id: string) {
    const exists = await prisma.lead.count({ where: { id } });
    if (!exists) throw new NotFoundError('Lead', id);

    return prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

function parseLead<T extends { categories: string }>(lead: T) {
  let categories: string[] = [];
  try {
    const parsed = JSON.parse(lead.categories);
    if (Array.isArray(parsed)) categories = parsed;
  } catch {
    // Malformed category JSON is not worth failing a read over.
  }

  return { ...lead, categories };
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export const leadService = new LeadService();
