import { Plus, X } from 'lucide-react';
import type { CampaignConfig } from '@bmatrix/shared';
import { Input, Checkbox } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * The discovery configuration form, shared by campaign creation and by adding a
 * run to an existing campaign.
 *
 * Search Mode and Industry are deliberately absent. Both were collected and
 * displayed but never reached query construction — a control that appears to
 * work and doesn't is worse than one that isn't there.
 */
export type DiscoveryConfigDraft = Omit<CampaignConfig, 'radius'> & { radius?: number };

export const emptyConfig: DiscoveryConfigDraft = {
  city: '',
  keywords: [''],
  localities: [],
  maxResults: 100,
  focusOnChains: false,
};

/** A repeating list of free-text values, used for keywords and localities. */
function StringList({
  label,
  hint,
  values,
  onChange,
  placeholder,
  addLabel,
  required,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  addLabel: string;
  required?: boolean;
}) {
  const rows = values.length > 0 ? values : [''];

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-critical-600"> *</span>}
      </legend>
      {hint && <p className="mb-1.5 text-xs text-slate-500">{hint}</p>}

      <div className="space-y-1.5">
        {rows.map((value, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={value}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            {rows.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                label={`Remove ${label.toLowerCase()} ${index + 1}`}
                icon={<X />}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        icon={<Plus />}
        onClick={() => onChange([...rows, ''])}
        className="mt-1.5"
      >
        {addLabel}
      </Button>
    </fieldset>
  );
}

export function DiscoveryFields({
  value,
  onChange,
}: {
  value: DiscoveryConfigDraft;
  onChange: (config: DiscoveryConfigDraft) => void;
}) {
  const update = <K extends keyof DiscoveryConfigDraft>(key: K, next: DiscoveryConfigDraft[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      <Input
        label="City"
        required
        value={value.city}
        placeholder="Mumbai"
        onChange={(event) => update('city', event.target.value)}
      />

      <StringList
        label="Keywords"
        required
        hint="What to search for. Each keyword runs as its own search."
        values={value.keywords}
        onChange={(next) => update('keywords', next)}
        placeholder="coffee shop"
        addLabel="Add keyword"
      />

      <StringList
        label="Localities"
        hint="Optional. Narrows the search to specific areas within the city."
        values={value.localities}
        onChange={(next) => update('localities', next)}
        placeholder="Bandra"
        addLabel="Add locality"
      />

      <Input
        label="Maximum leads"
        type="number"
        min={1}
        max={1000}
        value={value.maxResults}
        hint="Discovery stops once this many new leads are found."
        onChange={(event) => update('maxResults', Number(event.target.value))}
      />

      <Checkbox
        checked={value.focusOnChains}
        onChange={(checked) => update('focusOnChains', checked)}
        label="Include chains and franchises"
        hint="Adds chain, franchise, and outlet variants of each search. Uses more API quota."
      />
    </div>
  );
}

/** Shared client-side validation, so both entry points reject the same input. */
export function validateConfig(config: DiscoveryConfigDraft): string | null {
  if (!config.city.trim()) return 'Enter a city to search in.';
  if (config.keywords.filter((k) => k.trim()).length === 0) return 'Add at least one keyword.';
  return null;
}

/** Strip the empty rows the list inputs leave behind. */
export function cleanConfig(config: DiscoveryConfigDraft): CampaignConfig {
  return {
    ...config,
    city: config.city.trim(),
    keywords: config.keywords.map((k) => k.trim()).filter(Boolean),
    localities: config.localities.map((l) => l.trim()).filter(Boolean),
  };
}
