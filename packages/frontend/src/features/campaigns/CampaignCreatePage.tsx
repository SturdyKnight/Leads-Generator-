import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import type { Campaign, DiscoverySession } from '@bmatrix/shared';
import { api } from '../../lib/api-client';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import {
  DiscoveryFields,
  emptyConfig,
  validateConfig,
  cleanConfig,
  type DiscoveryConfigDraft,
} from './DiscoveryFields';

export function CampaignCreatePage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<DiscoveryConfigDraft>(emptyConfig);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const cleaned = cleanConfig(config);

      const campaign = await api.post<Campaign>('/campaigns', {
        name: name.trim(),
        description: description.trim() || undefined,
        config: cleaned,
      });

      // Creating the campaign also creates its first run, so the user lands on
      // a page that is already doing something.
      const session = await api.post<DiscoverySession>(
        `/campaigns/${campaign.data.id}/sessions`,
        { name: 'First run', config: cleaned },
      );

      await api.post(`/campaigns/${campaign.data.id}/sessions/${session.data.id}/start`);

      return campaign.data;
    },
    onSuccess: (campaign) => {
      toast.success('Campaign created. Discovery is running.');
      navigate(`/campaigns/${campaign.id}`);
    },
    onError: (err) => toast.error(err),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) return setError('Name your campaign.');

    const configError = validateConfig(config);
    if (configError) return setError(configError);

    setError(null);
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-2">
        <Link
          to="/campaigns"
          aria-label="Back to campaigns"
          className="group inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transform-none"
            aria-hidden
          />
        </Link>
        <div>
          <h1>New campaign</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discovery starts as soon as you create it.
          </p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card>
          <CardHeader title="Campaign" />
          <CardBody className="space-y-4">
            <Input
              label="Name"
              required
              value={name}
              placeholder="Mumbai coffee shops"
              error={error && !name.trim() ? error : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            <Textarea
              label="Description"
              rows={2}
              value={description}
              placeholder="Optional"
              onChange={(event) => setDescription(event.target.value)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="What to discover"
            description="Discovery starts as soon as the campaign is created."
          />
          <CardBody>
            <DiscoveryFields value={config} onChange={setConfig} />
          </CardBody>
        </Card>

        {error && name.trim() && (
          <p role="alert" className="text-sm text-critical-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link
            to="/campaigns"
            className="inline-flex h-11 items-center rounded-md px-5 text-sm font-medium text-slate-700 ring-2 ring-inset ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <Button type="submit" loading={create.isPending}>
            Create and start
          </Button>
        </div>
      </form>
    </div>
  );
}
