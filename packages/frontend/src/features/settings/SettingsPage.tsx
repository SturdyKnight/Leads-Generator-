import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Settings } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Checkbox } from '../../components/ui/Input';
import { SkeletonRows, ErrorState } from '../../components/ui/Feedback';
import { toast, extractMessage } from '../../components/ui/Toast';

const DEFAULTS: Settings = {
  companyName: '',
  timezone: 'UTC',
  defaultCountry: 'IN',
  defaultMaxResults: 100,
  aiClassificationEnabled: true,
  aiWebsiteIntelEnabled: true,
  aiOutreachEnabled: true,
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings>(DEFAULTS);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Settings>('/settings'),
  });

  // The API returns flat keys, so the response merges directly onto the form.
  useEffect(() => {
    if (data?.data) setForm({ ...DEFAULTS, ...data.data });
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put<Settings>('/settings', form),
    onSuccess: () => {
      toast.success('Settings saved');
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err),
  });

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="stagger mx-auto max-w-xl space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Defaults applied whenever you start something new.
        </p>
      </div>

      <Card>
        <CardHeader title="Defaults" description="Applied to new campaigns and discovery runs." />
        <CardBody>
          {isError ? (
            <ErrorState message={extractMessage(error)} onRetry={() => void refetch()} />
          ) : isLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
            >
              <Input
                label="Company name"
                value={form.companyName}
                placeholder="Your company"
                onChange={(event) => update('companyName', event.target.value)}
              />
              <Input
                label="Timezone"
                value={form.timezone}
                placeholder="Asia/Kolkata"
                onChange={(event) => update('timezone', event.target.value)}
              />
              <Input
                label="Default country"
                value={form.defaultCountry}
                placeholder="IN"
                maxLength={4}
                hint="Two-letter country code."
                onChange={(event) => update('defaultCountry', event.target.value.toUpperCase())}
              />
              <Input
                label="Default maximum leads"
                type="number"
                min={1}
                max={1000}
                value={form.defaultMaxResults}
                hint="Pre-filled when starting a new discovery run."
                onChange={(event) => update('defaultMaxResults', Number(event.target.value))}
              />

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-900">AI Features (MiMo)</h3>
                <p className="text-xs text-slate-500">Requires MIMO_API_KEY to be set on the server.</p>
                <Checkbox
                  label="Auto-classify chains and franchises"
                  checked={form.aiClassificationEnabled}
                  onChange={(checked) => update('aiClassificationEnabled', checked)}
                />
                <Checkbox
                  label="Analyze lead websites for intel"
                  checked={form.aiWebsiteIntelEnabled}
                  onChange={(checked) => update('aiWebsiteIntelEnabled', checked)}
                />
                <Checkbox
                  label="Enable AI outreach draft generation"
                  checked={form.aiOutreachEnabled}
                  onChange={(checked) => update('aiOutreachEnabled', checked)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={save.isPending}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
