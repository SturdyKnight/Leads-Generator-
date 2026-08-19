import React from 'react';
import type { LeadStatus } from '@bmatrix/shared';
import { cn } from '../../lib/utils';
import { humanizeStatus } from '../../lib/status';
import {
  STATUS_PILL_TOKENS,
  NEUTRAL_PILL_TOKEN,
  type StatusPillToken,
} from '../../lib/status-pill-tokens';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_SET = new Set(Object.keys(STATUS_PILL_TOKENS));

function resolveToken(status: string | null | undefined): {
  token: StatusPillToken;
  isKnown: boolean;
} {
  if (status && STATUS_SET.has(status)) {
    return { token: STATUS_PILL_TOKENS[status as LeadStatus], isKnown: true };
  }
  return { token: NEUTRAL_PILL_TOKEN, isKnown: false };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pipeline status value (UPPER_SNAKE_CASE). Null/undefined/unknown → neutral fallback. */
  status: string | null | undefined;
  /** When true, adds hover styles and cursor-pointer. */
  interactive?: boolean;
  /** Optional count badge displayed after the label. */
  count?: number;
  /** Size variant. Defaults to 'md'. */
  size?: 'sm' | 'md';
  /** Merged with internal classes — never overwrites them. */
  className?: string;
}

/**
 * Fully-rounded status pill.
 *
 * Soft low-saturation background with darker same-hue text. Label is
 * sentence-cased at render time only — the stored value is never mutated.
 *
 * Unknown or null statuses render a neutral slate pill with the raw string
 * as the label. The component never throws and never returns null.
 */
const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'py-1 px-3 text-xs',
} as const;

export function StatusPill({
  status,
  interactive = false,
  count,
  size = 'md',
  className,
  ...rest
}: StatusPillProps) {
  const { token, isKnown } = resolveToken(status);

  const label = isKnown
    ? humanizeStatus(status!)
    : status ?? '—';

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill',
        'border font-medium leading-none tracking-[0.01em]',
        SIZE_CLASSES[size],
        token.base,
        token.border,
        interactive && cn(token.hover, 'cursor-pointer transition-colors duration-150'),
        className,
      )}
      {...rest}
    >
      {label}
      {count != null && (
        <span className="ml-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold tabular">
          {count}
        </span>
      )}
    </span>
  );
}
