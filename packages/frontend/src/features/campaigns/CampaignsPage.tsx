import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Megaphone, Play, Pause, Archive, Trash2 } from 'lucide-react';
import type { Campaign, CampaignStatus } from '@bmatrix/shared';
import { CAMPAIGN_STATUSES, LEAD_STATUSES } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { formatRelative, pluralize, cn } from '../../lib/utils';
import { campaignStatusTone, humanizeStatus } from '../../lib/status';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pill } from '../../components/ui/Pill';
import { StatusPill } from '../../components/ui/StatusPill';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { toast, extractMessage } from '../../components/ui/Toast';

const FILTERS = [{ label: 'All', value: '' }, ...CAMPAIGN_STATUSES.map((s) => ({ label: humanizeStatus(s), value: s }))];

/** Compact pipeline summary for a campaign row. */
function PipelineSummary({ counts }: { counts: Record<string, number> }) {
  const present = LEAD_STATUSES.filter((status) => (counts[status] ?? 0) > 0);
  if (present.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {present.map((status) => (
        <StatusPill
          key={status}
          status={status}
          count={counts[status]}
          size="sm"
        />
      ))}
    </div>
  );
}

export function CampaignsPage() {
  const queryClient = useQueryClient();

  // Filters live in the URL so a filtered view survives reload and can be shared.
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const status = params.get('status') ?? '';

  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaigns', { search, status }],
    queryFn: () => api.get<Campaign[]>('/campaigns', { search, status: status || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns'] });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      api.patch<Campaign>(`/campaigns/${id}/status`, { status }),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Campaign updated');
      void invalidate();
    },
    onError: (err) => toast.error(err),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Campaign deleted');
      setPendingDelete(null);
      void invalidate();
    },
    onError: (err) => toast.error(err),
  });

  const campaigns = data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each campaign searches a city for the keywords you give it.
          </p>
        </div>
        <Link
          to="/campaigns/new"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-gradient-to-b from-accent-500 to-accent-600 px-5 text-sm font-medium text-white shadow-sm transition-[background-image,box-shadow,transform] duration-150 ease-out hover:from-accent-600 hover:to-accent-700 hover:shadow-md active:scale-[0.97] motion-reduce:transform-none"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New campaign
        </Link>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="search"
          placeholder="Search campaigns"
          aria-label="Search campaigns"
          icon={<Search />}
          defaultValue={search}
          onChange={(event) => setParam('q', event.target.value)}
          className="sm:max-w-xs"
        />
        {/* A segmented control, not four separate buttons: the selected one is
            raised out of a recessed track, so which filter is on is legible at
            a glance rather than only by colour. */}
        <div className="flex gap-0.5 self-start overflow-x-auto rounded-lg bg-slate-100 p-1 shadow-inset">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setParam('status', filter.value)}
              className={cn(
                'shrink-0 rounded-md px-3.5 py-2 text-xs font-medium transition-all duration-150 ease-out',
                status === filter.value
                  ? 'bg-white text-accent-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-900',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <Card>
          <ErrorState message={extractMessage(error)} onRetry={() => void refetch()} />
        </Card>
      ) : isLoading ? (
        <SkeletonRows rows={4} />
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone />}
            title={search || status ? 'No matching campaigns' : 'No campaigns yet'}
            description={
              search || status
                ? 'Try a different search or filter.'
                : 'A campaign defines what to search for and where.'
            }
          />
        </Card>
      ) : (
        <ul className="stagger space-y-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              {/* The whole card is the link. The title carries an overlay that
                  covers the card, so the click target matches the surface that
                  lifts — the row buttons sit above it and still win their own
                  clicks. */}
              <Card interactive className="group relative">
                <CardBody className="p-0">
                  <div className="flex flex-wrap items-start gap-3 p-5 sm:flex-nowrap sm:p-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="truncate text-base font-semibold text-slate-900 transition-colors after:absolute after:inset-0 after:rounded-xl after:content-[''] group-hover:text-accent-700"
                        >
                          {campaign.name}
                        </Link>
                        <Pill tone={campaignStatusTone(campaign.status)} label={campaign.status} />
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span className="tabular">{pluralize(campaign.totalLeads, 'lead')}</span>
                        {campaign.avgScore > 0 && (
                          <span className="tabular">avg score {campaign.avgScore}</span>
                        )}
                        <span>updated {formatRelative(campaign.updatedAt)}</span>
                      </p>

                      <PipelineSummary counts={campaign.leadsByStatus} />
                    </div>

                    <div className="relative z-10 flex shrink-0 items-center gap-1">
                      {campaign.status === 'PAUSED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Resume campaign"
                          icon={<Play />}
                          onClick={() => setStatus.mutate({ id: campaign.id, status: 'ACTIVE' })}
                        />
                      )}
                      {campaign.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Pause campaign"
                          icon={<Pause />}
                          onClick={() => setStatus.mutate({ id: campaign.id, status: 'PAUSED' })}
                        />
                      )}
                      {campaign.status !== 'ARCHIVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Archive campaign"
                          icon={<Archive />}
                          onClick={() => setStatus.mutate({ id: campaign.id, status: 'ARCHIVED' })}
                        />
                      )}
                      {campaign.status === 'ARCHIVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Delete campaign"
                          icon={<Trash2 />}
                          onClick={() => setPendingDelete(campaign)}
                          className="text-critical-600 hover:bg-critical-50"
                        />
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        loading={remove.isPending}
        title={`Delete "${pendingDelete?.name}"?`}
        message={`This permanently removes the campaign and its ${pluralize(
          pendingDelete?.totalLeads ?? 0,
          'lead',
        )}. This cannot be undone.`}
      />
    </div>
  );
}
