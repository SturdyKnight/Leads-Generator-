import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Play, Pause, Archive, Download, Search, Phone, Globe, ChevronLeft, ChevronRight,
  Users, Gauge, Trophy, Building2,
} from 'lucide-react';
import type { Campaign, CampaignStatus, DiscoverySession, Lead, PaginationMeta } from '@bmatrix/shared';
import { LEAD_STATUSES } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { formatDate, displayUrl, pluralize, formatNumber } from '../../lib/utils';
import { leadStatusTone, campaignStatusTone, humanizeStatus, scoreTone } from '../../lib/status';
import { Card, CardHeader, CardBody, Stat, StatGrid } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pill, FilterPill } from '../../components/ui/Pill';
import { StatusPill } from '../../components/ui/StatusPill';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { toast, extractMessage } from '../../components/ui/Toast';
import { SessionPanel } from './SessionPanel';
import { LeadDetailDialog } from './LeadDetailDialog';

const PAGE_SIZE = 25;

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors sm:px-6 duration-150 hover:bg-accent-50/60"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-medium text-slate-900 transition-colors group-hover:text-accent-700">
              {lead.name}
            </span>
            {lead.isChain && (
              <Building2 className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-label={lead.chainName ?? 'Chain'} />
            )}
            <StatusPill status={lead.status} />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            {lead.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" aria-hidden />
                {lead.phone}
              </span>
            )}
            {lead.website && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Globe className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{displayUrl(lead.website)}</span>
              </span>
            )}
            {!lead.phone && !lead.website && <span className="text-slate-400">No contact details</span>}
          </span>
        </span>
        {/* The score sits in its own chip so it reads as a measurement rather
            than as another piece of the business's address. */}
        <span
          className={`tabular shrink-0 rounded-md bg-slate-50 px-2 py-1 text-sm font-semibold ring-1 ring-inset ring-slate-200 ${scoreTone(
            lead.score,
          )}`}
        >
          {lead.score}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-slate-300 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent-500 motion-reduce:transform-none"
          aria-hidden
        />
      </button>
    </li>
  );
}

export function CampaignDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  // Filter, page, and the open lead all live in the URL, so the view is
  // shareable and the browser Back button closes the dialog.
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') ?? '';
  const sessionFilter = params.get('run');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const openLeadId = params.get('lead');
  const [search, setSearch] = useState('');

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const campaign = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`),
  });

  const sessions = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => api.get<DiscoverySession[]>(`/campaigns/${id}/sessions`),
  });

  const leads = useQuery({
    queryKey: ['leads', id, { statusFilter, sessionFilter, page, search }],
    queryFn: () =>
      api.get<Lead[]>('/leads', {
        campaignId: id,
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        sessionId: sessionFilter || undefined,
        search: search || undefined,
      }),
  });

  const setStatus = useMutation({
    mutationFn: (status: CampaignStatus) => api.patch(`/campaigns/${id}/status`, { status }),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Campaign updated');
      void queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
    onError: (error) => toast.error(error),
  });

  const exportLeads = async () => {
    try {
      await api.download(`/campaigns/${id}/export`, { status: statusFilter || undefined });
    } catch (error) {
      toast.error(error);
    }
  };

  if (campaign.isError) {
    return (
      <Card>
        <ErrorState
          title="Campaign not found"
          message={extractMessage(campaign.error)}
          onRetry={() => void campaign.refetch()}
        />
      </Card>
    );
  }

  const data = campaign.data?.data;
  const meta = leads.data?.meta as PaginationMeta | undefined;
  const rows = leads.data?.data ?? [];
  const counts = data?.leadsByStatus ?? {};
  const activeStages = LEAD_STATUSES.filter((status) => (counts[status] ?? 0) > 0);

  return (
    <div className="stagger space-y-6">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          to="/campaigns"
          aria-label="Back to campaigns"
          className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transform-none"
            aria-hidden
          />
        </Link>

        <div className="min-w-0 flex-1">
          {campaign.isLoading ? (
            <div className="skeleton h-7 w-56" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate">{data?.name}</h1>
                <Pill tone={campaignStatusTone(data?.status ?? '')} label={data?.status ?? ''} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {data?.config.city} · created {formatDate(data?.createdAt ?? null)}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {data?.status === 'PAUSED' && (
            <Button variant="secondary" icon={<Play />} onClick={() => setStatus.mutate('ACTIVE')}>
              Resume
            </Button>
          )}
          {data?.status === 'ACTIVE' && (
            <Button variant="secondary" icon={<Pause />} onClick={() => setStatus.mutate('PAUSED')}>
              Pause
            </Button>
          )}
          {data && data.status !== 'ARCHIVED' && (
            <Button
              variant="ghost"
              label="Archive campaign"
              icon={<Archive />}
              onClick={() => setStatus.mutate('ARCHIVED')}
            />
          )}
        </div>
      </header>

      <Card>
        <StatGrid className="sm:grid-cols-3">
          {[
            { label: 'Leads', value: formatNumber(data?.totalLeads ?? 0), icon: <Users /> },
            { label: 'Avg score', value: `${data?.avgScore ?? 0}`, icon: <Gauge /> },
            { label: 'Won', value: formatNumber(counts.WON ?? 0), icon: <Trophy /> },
          ].map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </StatGrid>

        {activeStages.length > 0 && (
          <CardBody className="border-t border-slate-200">
            <div className="flex flex-wrap gap-1.5">
              {activeStages.map((stage) => (
                <FilterPill
                  key={stage}
                  tone={leadStatusTone(stage)}
                  label={stage}
                  count={counts[stage]}
                  active={statusFilter === stage}
                  onClick={() =>
                    setParam({ status: statusFilter === stage ? null : stage, page: null })
                  }
                />
              ))}
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setParam({ status: null, page: null })}
                  className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </CardBody>
        )}
      </Card>

      <SessionPanel
        campaignId={id}
        sessions={sessions.data?.data ?? []}
        activeSessionId={sessionFilter}
        onSelectSession={(sessionId) => setParam({ run: sessionId, page: null })}
      />

      <Card>
        <CardHeader
          title="Leads"
          description={
            meta
              ? `${pluralize(meta.total, 'lead')}${statusFilter ? ` · ${humanizeStatus(statusFilter)}` : ''}${
                  sessionFilter ? ' · filtered to one run' : ''
                }`
              : undefined
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Download />}
              onClick={() => void exportLeads()}
            >
              Export
            </Button>
          }
        />

        <CardBody className="border-b border-slate-200 py-2.5">
          <Input
            type="search"
            placeholder="Search by name, phone, or address"
            aria-label="Search leads"
            icon={<Search />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (page !== 1) setParam({ page: null });
            }}
          />
        </CardBody>

        {leads.isError ? (
          <ErrorState message={extractMessage(leads.error)} onRetry={() => void leads.refetch()} />
        ) : leads.isLoading ? (
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        ) : rows.length === 0 ? (
          <EmptyState
            title={statusFilter || search ? 'No matching leads' : 'No leads yet'}
            description={
              statusFilter || search
                ? 'Try clearing the filter or search.'
                : 'Start a discovery run to collect leads.'
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-200">
              {rows.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onOpen={() => setParam({ lead: lead.id })}
                />
              ))}
            </ul>

            {/* Pagination — leads past the first page used to be unreachable. */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 sm:px-6">
                <p className="tabular text-xs text-slate-500">
                  Page {meta.page} of {meta.totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Previous page"
                    icon={<ChevronLeft />}
                    disabled={!meta.hasPrev}
                    onClick={() => setParam({ page: String(meta.page - 1) })}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Next page"
                    icon={<ChevronRight />}
                    disabled={!meta.hasNext}
                    onClick={() => setParam({ page: String(meta.page + 1) })}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <LeadDetailDialog leadId={openLeadId} onClose={() => setParam({ lead: null })} />
    </div>
  );
}
