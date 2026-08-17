import React from 'react';
import { cn } from '../../lib/utils';

/**
 * A plain surface. Padding belongs to the sections inside it, not to the card —
 * applying both is what produced doubled insets throughout the old UI.
 *
 * Hover elevation is opt-in via `interactive`. A card that lifts under the
 * cursor is claiming to be clickable, so only actually-clickable cards do it.
 * The lift is a real 2px rise plus a deeper shadow and an accent-tinted edge:
 * three cues for one state, so it still reads without colour and still reads
 * when motion is turned down.
 */
export function Card({
  interactive,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        // A full-strength 2px edge plus a real shadow: the border draws the
        // container, the shadow lifts it off the page. `overflow-hidden` lets
        // the header band and the gap-ruled stat grids meet the rounded corner
        // cleanly instead of squaring it off.
        'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md',
        interactive && [
          'transition-[transform,box-shadow,border-color] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-lift',
          // Pressing it puts the card back down, so the click has a floor.
          'active:translate-y-0 active:shadow-md active:duration-75',
          'motion-reduce:transform-none motion-reduce:transition-none',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Faintly tinted and rounded to match the card, so the header reads as
        // a band rather than as the first row of the body.
        'flex flex-wrap items-start justify-between gap-3 border-b border-slate-200',
        'bg-slate-50/60 px-5 py-4 sm:px-6 sm:py-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 py-4 sm:px-6 sm:py-5', className)}>{children}</div>;
}

/**
 * A row of `Stat`s. Separators are the container's own background showing
 * through a 2px grid gap, so they land correctly at every column count — the
 * `divide-x` this replaced drew a stray rule down the first cell of the second
 * row as soon as the grid wrapped.
 */
export function StatGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid grid-cols-1 gap-[2px] bg-slate-200', className)}>{children}</div>
  );
}

/**
 * A single headline number, with the small uppercase label that names it and an
 * optional icon to anchor it. Used wherever a row of statistics appears — the
 * overview and the campaign detail page had two hand-rolled copies of this that
 * had already drifted apart.
 */
export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('group bg-white px-5 py-4 sm:px-6 sm:py-5', className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              'bg-accent-50 text-accent-600 transition-colors duration-200',
              'group-hover:bg-accent-100 group-hover:text-accent-700',
              '[&>svg]:h-3.5 [&>svg]:w-3.5',
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-medium uppercase tracking-label text-slate-500">{label}</p>
      </div>
      <p className="tabular mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
