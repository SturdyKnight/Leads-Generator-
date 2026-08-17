import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Megaphone, Users, PhoneCall, Gauge, ChevronRight } from 'lucide-react';
import type { Campaign, DashboardStats } from '@bmatrix/shared';
import { LEAD_STATUSES } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { formatNumber, formatRelative, pluralize } from '../../lib/utils';
import { leadStatusTone, campaignStatusTone } from '../../lib/status';
import { Card, CardHeader, CardBody, Stat, StatGrid } from '../../components/ui/Card';
import { Pill } from '../../components/ui/Pill';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { extractMessage } from '../../components/ui/Toast';

export function OverviewPage() {
  const stats = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const campaigns = useQuery({
    queryKey: ['campaigns', 'recent'],
    queryFn: () => api.get<Campaign[]>('/campaigns', { limit: 5, sortBy: 'updatedAt' }),
  });

  if (stats.isError) {
    return (
      <ErrorState message={extractMessage(stats.error)} onRetry={() => void stats.refetch()} />
    );
  }

  const data = stats.data?.data;
  const recent = campaigns.data?.data ?? [];

  // Only render stages that actually have leads, in pipeline order.
  const pipeline = LEAD_STATUSES.filter((status) => (data?.leadsByStatus[status] ?? 0) > 0);

  return (
    <div className="stagger space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything happening across your campaigns.
          </p>
        </div>
        <Link
          to="/campaigns/new"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-gradient-to-b from-accent-500 to-accent-600 px-5 text-sm font-medium text-white shadow-sm transition-[background-image,box-shadow,transform] duration-150 ease-out hover:from-accent-600 hover:to-accent-700 hover:shadow-md active:scale-[0.97] motion-reduce:transform-none"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New campaign
        </Link>
      </header>

      <Card>
        {stats.isLoading ? (
          <StatGrid className="sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2 bg-white px-5 py-4 sm:px-6 sm:py-5">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-8 w-14" />
              </div>
            ))}
          </StatGrid>
        ) : (
          // One per row on a phone, two on a tablet, four across on a desktop —
          // four 30px numbers side by side do not fit a narrow screen.
          <StatGrid className="sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<Users />}
              label="Leads"
              value={formatNumber(data?.totalLeads ?? 0)}
              hint={`${data?.newThisWeek ?? 0} this week`}
            />
            <Stat
              icon={<Megaphone />}
              label="Campaigns"
              value={formatNumber(data?.activeCampaigns ?? 0)}
              hint="active"
            />
            <Stat
              icon={<PhoneCall />}
              label="Contacted"
              value={formatNumber(data?.contactedLeads ?? 0)}
              hint="reached out"
            />
            <Stat
              icon={<Gauge />}
              label="Avg score"
              value={`${data?.averageScore ?? 0}`}
              hint="out of 100"
            />
          </StatGrid>
        )}
      </Card>

      <Card>
        <CardHeader title="Pipeline" description="Leads by stage, across all campaigns" />
        <CardBody>
          {stats.isLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton h-6 w-24 rounded-pill" />
              ))}
            </div>
          ) : pipeline.length === 0 ? (
            <p className="text-sm text-slate-500">
              No leads yet. Create a campaign to start discovering them.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pipeline.map((status) => (
                <Pill
                  key={status}
                  tone={leadStatusTone(status)}
                  label={status}
                  count={data!.leadsByStatus[status]}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recent campaigns"
          action={
            <Link
              to="/campaigns"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 transition-colors hover:text-accent-700"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        {campaigns.isLoading ? (
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Megaphone />}
            title="No campaigns yet"
            description="A campaign defines what to search for and where."
            action={
              <Link
                to="/campaigns/new"
                className="text-sm font-medium text-accent-600 hover:text-accent-700"
              >
                Create your first campaign
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {recent.map((campaign) => (
              <li key={campaign.id}>
                {/* A real link, so it can be opened in a new tab and reached by keyboard. */}
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="group flex items-center gap-3 px-5 py-4 transition-colors sm:px-6 duration-150 hover:bg-accent-50/60"
                >
                  <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-900 transition-colors group-hover:text-accent-700">
                    {campaign.name}
                  </span>
                  <Pill tone={campaignStatusTone(campaign.status)} label={campaign.status} />
                  <span className="tabular hidden w-24 text-right text-xs text-slate-500 sm:block">
                    {pluralize(campaign.totalLeads, 'lead')}
                  </span>
                  <span className="hidden w-20 text-right text-xs text-slate-400 sm:block">
                    {formatRelative(campaign.updatedAt)}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-300 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent-500 motion-reduce:transform-none"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
