import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Globe, MapPin, Star, ExternalLink } from 'lucide-react';
import type { LeadDetail, LeadStatus } from '@bmatrix/shared';
import { LEAD_STATUSES } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { formatRelative, displayUrl } from '../../lib/utils';
import { leadStatusTone, humanizeStatus, scoreTone } from '../../lib/status';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Textarea, Select } from '../../components/ui/Input';
import { Pill } from '../../components/ui/Pill';
import { SkeletonRows } from '../../components/ui/Feedback';
import { toast } from '../../components/ui/Toast';

const STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({
  value: status,
  label: humanizeStatus(status),
}));

/**
 * Everything about one lead: contact details, pipeline position, notes, and the
 * activity trail. Replaces the read-only modal that could not do anything.
 */
export function LeadDetailDialog({
  leadId,
  onClose,
}: {
  leadId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get<LeadDetail>(`/leads/${leadId}`),
    enabled: leadId !== null,
  });

  const lead = data?.data;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    void queryClient.invalidateQueries({ queryKey: ['leads'] });
    void queryClient.invalidateQueries({ queryKey: ['campaign'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: LeadStatus) => api.patch(`/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/leads/${leadId}/notes`, { note: note.trim() }),
    onSuccess: () => {
      toast.success('Note added');
      setNote('');
      refresh();
    },
    onError: (error) => toast.error(error),
  });

  return (
    <Dialog
      open={leadId !== null}
      onClose={onClose}
      size="lg"
      title={lead?.name ?? 'Lead'}
      description={lead?.categories.slice(0, 3).join(' · ') || undefined}
    >
      {isLoading || !lead ? (
        <SkeletonRows rows={4} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`tabular inline-flex items-baseline rounded-lg bg-slate-50 px-3 py-1.5 text-lg font-semibold ring-1 ring-inset ring-slate-200 ${scoreTone(
                lead.score,
              )}`}
            >
              {lead.score}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </span>
            <Pill tone={leadStatusTone(lead.status)} label={lead.status} />
            {lead.rating != null && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="h-3.5 w-3.5 text-caution-600" aria-hidden />
                <span className="tabular">{lead.rating}</span>
                <span>({lead.reviewCount ?? 0})</span>
              </span>
            )}
            {lead.source === 'chain_franchise' && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                Chain
              </span>
            )}
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-label text-slate-500">Contact</h3>
            {!lead.phone && !lead.website && !lead.address ? (
              <p className="text-sm text-slate-400">
                Google Places returned no contact details for this business.
              </p>
            ) : (
              <dl className="space-y-2 text-sm">
                {lead.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <a href={`tel:${lead.phone}`} className="text-accent-700 hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 break-all text-accent-700 hover:underline"
                    >
                      {displayUrl(lead.website)}
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                    </a>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="text-slate-700">{lead.address}</span>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-label text-slate-500">Stage</h3>
            <Select
              aria-label="Lead status"
              options={STATUS_OPTIONS}
              value={lead.status}
              disabled={setStatus.isPending}
              onChange={(value) => setStatus.mutate(value as LeadStatus)}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-label text-slate-500">Notes</h3>
            {lead.notes && (
              <p className="whitespace-pre-wrap rounded-lg bg-accent-50/60 p-3 text-sm text-slate-700 ring-1 ring-inset ring-accent-100">
                {lead.notes}
              </p>
            )}
            <Textarea
              rows={2}
              value={note}
              placeholder="Add a note"
              aria-label="Add a note"
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!note.trim()}
                loading={addNote.isPending}
                onClick={() => addNote.mutate()}
              >
                Add note
              </Button>
            </div>
          </section>

          {lead.logs.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-label text-slate-500">
                Activity
              </h3>
              <ul className="space-y-1.5">
                {lead.logs.map((log) => (
                  <li key={log.id} className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 text-slate-600">{log.message}</span>
                    <span className="shrink-0 text-slate-400">{formatRelative(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
