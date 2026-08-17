import React from 'react';
import { cn } from '../../lib/utils';

/** Placeholder shown while a query is in flight. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-md" />
      ))}
    </div>
  );
}

/** Shown when a list is legitimately empty, with the action that fills it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center animate-fade-in">
      {icon && (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-400 ring-1 ring-inset ring-accent-100 [&>svg]:h-5 [&>svg]:w-5"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Shown when a request failed. Always carries the real reason — the previous UI
 * replaced every server message with a fixed string, which turned recoverable
 * problems into dead ends.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-accent-600 hover:text-accent-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Determinate progress. Used wherever the real ratio is known. */
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value * 100)));

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <div
        className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-accent-500 to-accent-600 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      >
        {/* A highlight travelling along the filled portion. Work continues
            between the discrete steps the ratio reports, and a bar that only
            moves once a minute reads as a stall. */}
        <span
          className="absolute inset-y-0 left-0 w-1/3 bg-white/40 animate-sheen motion-reduce:hidden"
          aria-hidden
        />
      </div>
    </div>
  );
}
