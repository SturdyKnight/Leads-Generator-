/**
 * Dashboard aggregates. Every figure here is derived from data the app actually
 * writes — the previous version reported a "new leads" count for a status
 * nothing sets, and an activity feed from a table nothing writes to.
 */

import { prisma } from '../config/database.js';

export interface DashboardStats {
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  contactedLeads: number;
  wonLeads: number;
  conversionRate: number;
  averageScore: number;
  newThisWeek: number;
  leadsByStatus: Record<string, number>;
}

/** Statuses that mean the lead has been worked, for the conversion figure. */
const CONTACTED_ONWARD = [
  'CONTACTED',
  'INTERESTED',
  'DEMO_SCHEDULED',
  'DEMO_COMPLETED',
  'NEGOTIATION',
  'WON',
];

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalLeads, totalCampaigns, activeCampaigns, newThisWeek, aggregate, grouped] =
      await Promise.all([
        prisma.lead.count(),
        prisma.campaign.count(),
        prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.lead.aggregate({ _avg: { score: true } }),
        prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);

    const leadsByStatus = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));

    const contactedLeads = CONTACTED_ONWARD.reduce(
      (sum, status) => sum + (leadsByStatus[status] ?? 0),
      0,
    );
    const wonLeads = leadsByStatus.WON ?? 0;

    return {
      totalLeads,
      totalCampaigns,
      activeCampaigns,
      contactedLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0,
      averageScore: Math.round(aggregate._avg.score ?? 0),
      newThisWeek,
      leadsByStatus,
    };
  }

  /**
   * Recent pipeline movement, drawn from the lead activity timeline.
   * Aggregated in SQL rather than by loading every lead into memory.
   */
  async getRecentActivity(limit = 15) {
    const activities = await prisma.leadActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
            campaign: { select: { id: true, name: true } },
          },
        },
      },
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
      lead: activity.lead,
    }));
  }
}

export const dashboardService = new DashboardService();
