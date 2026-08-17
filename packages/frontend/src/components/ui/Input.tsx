import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Ids come from `useId`, not from a slugified label — two fields sharing a
 * label used to produce duplicate DOM ids. Hints and errors are wired through
 * `aria-describedby` so they are announced rather than merely displayed.
 */
function useField({ label, hint, error }: FieldProps, providedId?: string) {
  const generated = useId();
  const id = providedId ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return {
    id,
    hintId,
    errorId,
    describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined,
    labelNode: label ? (
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
    ) : null,
    messageNode: error ? (
      <p id={errorId} role="alert" className="mt-1 text-xs text-critical-600">
        {error}
      </p>
    ) : hint ? (
      <p id={hintId} className="mt-1 text-xs text-slate-500">
        {hint}
      </p>
    ) : null,
  };
}

const CONTROL = [
  'block w-full rounded-md border bg-white px-3 text-sm text-slate-900',
  'placeholder:text-slate-400',
  'transition-colors duration-150 ease-out',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
].join(' ');

/** Idle, hover, and focus edges for a control that is not in an error state. */
const EDGE = 'border-slate-300 hover:border-accent-300 focus:border-accent-500';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps & { icon?: React.ReactNode }
>(function Input({ label, hint, error, icon, className, id: providedId, ...props }, ref) {
  const field = useField({ label, hint, error }, providedId);

  return (
    <div className="w-full">
      {field.labelNode}
      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 [&>svg]:h-4 [&>svg]:w-4"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={field.id}
          aria-invalid={error ? true : undefined}
          aria-describedby={field.describedBy}
          className={cn(
            CONTROL,
            'h-11',
            error ? 'border-critical-600' : EDGE,
            icon && 'pl-9',
            className,
          )}
          {...props}
        />
      </div>
      {field.messageNode}
    </div>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, hint, error, className, id: providedId, ...props }, ref) {
  const field = useField({ label, hint, error }, providedId);

  return (
    <div className="w-full">
      {field.labelNode}
      <textarea
        ref={ref}
        id={field.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={field.describedBy}
        className={cn(
          CONTROL,
          'resize-y py-2',
          error ? 'border-critical-600' : EDGE,
          className,
        )}
        {...props}
      />
      {field.messageNode}
    </div>
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> &
    FieldProps & {
      options: { label: string; value: string }[];
      onChange?: (value: string) => void;
    }
>(function Select({ label, hint, error, options, onChange, className, id: providedId, ...props }, ref) {
  const field = useField({ label, hint, error }, providedId);

  return (
    <div className="w-full">
      {field.labelNode}
      <select
        ref={ref}
        id={field.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={field.describedBy}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          CONTROL,
          'h-11 cursor-pointer appearance-none pr-10',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' stroke=\'%239797b2\' stroke-width=\'2\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat',
          error ? 'border-critical-600' : EDGE,
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.messageNode}
    </div>
  );
});

/** A native checkbox with a label — no custom widget, no focus gap. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-slate-300 accent-accent-600"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
