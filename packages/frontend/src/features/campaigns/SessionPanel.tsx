import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Trash2, Download, Plus } from 'lucide-react';
import type { DiscoverySession } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { useLive } from '../../hooks/use-sse';
import { formatRelative, pluralize, cn } from '../../lib/utils';
import { sessionStatusTone } from '../../lib/status';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pill } from '../../components/ui/Pill';
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog';
import { ProgressBar, EmptyState } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';
import {
  DiscoveryFields,
  emptyConfig,
  validateConfig,
  cleanConfig,
  type DiscoveryConfigDraft,
} from './DiscoveryFields';

/**
 * Discovery runs for a campaign.
 *
 * A running session shows real progress from the SSE payload rather than an
 * indefinite spinner, and can always be stopped — a run that could only be
 * deleted used to mean losing every lead it had already found.
 */
export function SessionPanel({
  campaignId,
  sessions,
  activeSessionId,
  onSelectSession,
}: {
  campaignId: string;
  sessions: DiscoverySession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const { progress } = useLive();

  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DiscoverySession | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftConfig, setDraftConfig] = useState<DiscoveryConfigDraft>(emptyConfig);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['sessions', campaignId] });
    void queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const session = await api.post<DiscoverySession>(`/campaigns/${campaignId}/sessions`, {
        name: draftName.trim(),
        config: cleanConfig(draftConfig),
      });
      await api.post(`/campaigns/${campaignId}/sessions/${session.data.id}/start`);
      return session.data;
    },
    onSuccess: (session) => {
      toast.success('Discovery started');
      setShowCreate(false);
      setDraftName('');
      setDraftConfig(emptyConfig);
      onSelectSession(session.id);
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  const start = useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/campaigns/${campaignId}/sessions/${sessionId}/start`),
    onSuccess: () => {
      toast.success('Discovery started');
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  const cancel = useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/campaigns/${campaignId}/sessions/${sessionId}/cancel`),
    onSuccess: (response) => {
      toast.info(response.message ?? 'Stopping');
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  const remove = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/campaigns/${campaignId}/sessions/${sessionId}`),
    onSuccess: (response) => {
      toast.success(response.message ?? 'Run deleted');
      setPendingDelete(null);
      if (activeSessionId === pendingDelete?.id) onSelectSession(null);
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  const exportSession = async (session: DiscoverySession) => {
    try {
      await api.download(`/campaigns/${campaignId}/sessions/${session.id}/export`);
    } catch (error) {
      toast.error(error);
    }
  };

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftName.trim()) return toast.error('Name this run');

    const error = validateConfig(draftConfig);
    if (error) return toast.error(error);

    create.mutate();
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Discovery runs"
          description="Each run searches and adds new leads to this campaign."
          action={
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setShowCreate(true)}>
              New run
            </Button>
          }
        />

        {sessions.length === 0 ? (
          <EmptyState
            title="No runs yet"
            description="Start a discovery run to collect leads for this campaign."
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {sessions.map((session) => {
              const live = progress[session.id];
              const isRunning = session.status === 'RUNNING';
              const isSelected = activeSessionId === session.id;

              return (
                <li
                  key={session.id}
                  className={cn(
                    'relative transition-colors duration-150',
                    isSelected ? 'bg-accent-50/70' : 'hover:bg-slate-50/70',
                  )}
                >
                  {/* The run currently filtering the lead list, marked on the
                      edge as well as by tint — the tint alone is easy to miss
                      when only one run exists. */}
                  {isSelected && (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-accent-600" aria-hidden />
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 sm:px-6">
                    <button
                      type="button"
                      onClick={() => onSelectSession(isSelected ? null : session.id)}
                      aria-pressed={isSelected}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-medium text-slate-900">
                          {session.name}
                        </span>
                        <Pill tone={sessionStatusTone(session.status)} label={session.status} />
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span className="tabular">{pluralize(session.totalLeads, 'lead')}</span>
                        <span>·</span>
                        <span className="truncate">
                          {session.config.keywords.join(', ')} in {session.config.city}
                        </span>
                        {session.discoveredAt && (
                          <>
                            <span>·</span>
                            <span>{formatRelative(session.discoveredAt)}</span>
                          </>
                        )}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {isRunning ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Stop this run"
                          icon={<Square />}
                          loading={cancel.isPending}
                          onClick={() => cancel.mutate(session.id)}
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          label={session.status === 'PENDING' ? 'Start this run' : 'Run again'}
                          icon={<Play />}
                          onClick={() => start.mutate(session.id)}
                        />
                      )}
                      {session.totalLeads > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Export this run to Excel"
                          icon={<Download />}
                          onClick={() => void exportSession(session)}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        label="Delete this run"
                        icon={<Trash2 />}
                        disabled={isRunning}
                        onClick={() => setPendingDelete(session)}
                        className="text-critical-600 hover:bg-critical-50"
                      />
                    </div>

                    {isRunning && (
                      <div className="w-full space-y-1">
                        <ProgressBar
                          label="Discovery progress"
                          value={live ? live.completedTasks / Math.max(1, live.totalTasks) : 0}
                        />
                        <p className="tabular text-xs text-slate-500">
                          {live
                            ? `Search ${live.completedTasks} of ${live.totalTasks} · ${live.discoveredLeads} leads found`
                            : 'Starting…'}
                          {live && live.failedTasks > 0 && ` · ${live.failedTasks} failed`}
                        </p>
                      </div>
                    )}

                    {session.error && !isRunning && (
                      <p className="w-full text-xs text-critical-600">{session.error}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New discovery run"
        description="Leads already in this campaign are skipped automatically."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={submitCreate}>
              Start run
            </Button>
          </>
        }
      >
        <form onSubmit={submitCreate} className="space-y-4" noValidate>
          <Input
            label="Run name"
            required
            value={draftName}
            placeholder="Second sweep"
            onChange={(event) => setDraftName(event.target.value)}
          />
          <DiscoveryFields value={draftConfig} onChange={setDraftConfig} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        loading={remove.isPending}
        title={`Delete "${pendingDelete?.name}"?`}
        message={`This permanently removes the run and the ${pluralize(
          pendingDelete?.totalLeads ?? 0,
          'lead',
        )} it found. This cannot be undone.`}
      />
    </>
  );
}
