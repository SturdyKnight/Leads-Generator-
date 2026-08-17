import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

/**
 * An icon-only button must still say what it does, so `label` is required
 * whenever there are no children. The type system enforces it — this used to be
 * a runtime oversight repeated across a dozen call sites.
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
} & ({ children: React.ReactNode; label?: string } | { children?: never; label: string });

/**
 * The primary is a shallow vertical gradient rather than a flat fill — two
 * stops one step apart on the same ramp, which reads as a lit surface without
 * turning the button into decoration. Every other variant stays flat, so there
 * is never a question about which action is the main one.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-sm hover:from-accent-600 hover:to-accent-700 hover:shadow-md',
  secondary:
    'bg-white text-slate-700 ring-2 ring-inset ring-slate-200 hover:bg-accent-50 hover:text-accent-700 hover:ring-accent-200',
  ghost: 'text-slate-600 hover:bg-accent-50 hover:text-accent-700',
  danger: 'bg-white text-critical-600 ring-2 ring-inset ring-slate-200 hover:bg-critical-50',
};

// Heights track the type scale — a 17px label in a 40px control reads cramped.
const SIZES: Record<Size, string> = {
  sm: 'h-10 gap-1.5 px-3.5 text-xs',
  md: 'h-11 gap-2 px-5 text-sm',
};

// Square targets, comfortably above the 24px minimum for pointer targets.
const ICON_ONLY: Record<Size, string> = { sm: 'w-10 px-0', md: 'w-11 px-0' };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, label, className, children, disabled, ...props },
  ref,
) {
  const iconOnly = !children;

  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      aria-label={label}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium',
        // A small press: the button gives under the cursor, so a click that is
        // about to start a long request still feels acknowledged immediately.
        'transition-[background-color,background-image,color,box-shadow,transform] duration-150 ease-out',
        'active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        iconOnly && ICON_ONLY[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      )}
      {children}
    </button>
  );
});
