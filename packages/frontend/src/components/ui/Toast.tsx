import { useEffect } from 'react';
import { create } from 'zustand';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message) =>
    set((state) => ({
      // Cap the stack so a burst of SSE-driven failures cannot fill the screen.
      toasts: [...state.toasts, { id: nextId++, kind, message }].slice(-3),
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Toast helpers. `error` accepts an unknown so callers can pass a caught value
 * straight through and still get the server's own message.
 */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  info: (message: string) => useToastStore.getState().push('info', message),
  error: (error: unknown, fallback = 'Something went wrong') =>
    useToastStore.getState().push('error', extractMessage(error) ?? fallback),
};

export function extractMessage(error: unknown): string | undefined {
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return undefined;
}

/** Icon colour and the matching left rail, so kind reads before the text does. */
const KINDS: Record<ToastKind, { icon: typeof Info; className: string; rail: string }> = {
  success: { icon: CheckCircle2, className: 'text-positive-600', rail: 'border-l-positive-600' },
  error: { icon: AlertCircle, className: 'text-critical-600', rail: 'border-l-critical-600' },
  info: { icon: Info, className: 'text-accent-600', rail: 'border-l-accent-600' },
};

const DURATION_MS = 6000;

function ToastItem({ toast: item }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, className, rail } = KINDS[item.kind];

  useEffect(() => {
    // Errors stay until dismissed — they usually need reading and acting on.
    if (item.kind === 'error') return;

    const timer = setTimeout(() => dismiss(item.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [item.id, item.kind, dismiss]);

  return (
    <div
      className={cn(
        'flex w-80 items-start gap-2.5 rounded-xl border border-l-[3px] border-slate-200 bg-white p-3',
        'shadow-lg animate-slide-up',
        rail,
      )}
    >
      <Icon className={cn('mt-px h-4 w-4 shrink-0', className)} aria-hidden />
      <p className="min-w-0 flex-1 break-words text-sm text-slate-700">{item.message}</p>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded text-slate-400 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItem toast={item} />
        </div>
      ))}
    </div>
  );
}
