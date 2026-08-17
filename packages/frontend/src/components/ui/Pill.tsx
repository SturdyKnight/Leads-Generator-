import React from 'react';
import { cn } from '../../lib/utils';
import { humanizeStatus, type StatusTone } from '../../lib/status';

/**
 * Status pills.
 *
 * Fully rounded and carrying a leading state dot, so pipeline state reads as a
 * distinct shape before the text is parsed. Tinted background with dark text
 * rather than a saturated fill with white text — it stays quiet at small sizes
 * and clears contrast requirements the old white-on-amber fills failed.
 */
export function Pill({
  tone,
  label,
  count,
  dot = true,
  size = 'md',
  className,
}: {
  tone: StatusTone;
  label: string;
  count?: number;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        tone.chip,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-pill', tone.dot)} aria-hidden />}
      {humanizeStatus(label)}
      {count !== undefined && (
        <span className="tabular rounded-pill bg-white/60 px-1.5 text-xs font-semibold">
          {count}
        </span>
      )}
    </span>
  );
}

/**
 * A pill that filters. Pressed state is carried by a ring plus `aria-pressed`,
 * so it does not rely on colour alone.
 */
export function FilterPill({
  tone,
  label,
  count,
  active,
  className,
  ...props
}: {
  tone: StatusTone;
  label: string;
  count?: number;
  active?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-medium',
        // Grows a hair under the cursor so it is obvious the pill is a control
        // and not just a label sitting next to the ones that are.
        'transition-[box-shadow,transform] duration-150 ease-out',
        'hover:scale-105 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none',
        tone.chip,
        active
          ? 'ring-2 ring-inset ring-accent-600'
          : 'ring-1 ring-inset ring-transparent hover:ring-accent-300',
        className,
      )}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-pill', tone.dot)} aria-hidden />
      {humanizeStatus(label)}
      {count !== undefined && (
        <span className="tabular rounded-pill bg-white/60 px-1.5 text-xs font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}
