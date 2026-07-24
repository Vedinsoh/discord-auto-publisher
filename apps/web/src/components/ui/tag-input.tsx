'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxItems?: number;
  /** Returns an error message for an invalid candidate, or null if it's valid. */
  validate?: (value: string) => string | null;
  /** Transforms each entry before it is stored (e.g. trimming). */
  transform?: (value: string) => string;
  className?: string;
}

/**
 * Chip input: type + Enter/comma (or paste comma/newline-separated) to add,
 * click ✕ or Backspace-on-empty to remove. Dedupes and enforces an optional max
 * and per-item validation.
 */
export function TagInput({
  values,
  onChange,
  placeholder,
  disabled = false,
  maxItems,
  validate,
  transform,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const atMax = maxItems !== undefined && values.length >= maxItems;

  const commit = (raw: string) => {
    const parts = raw
      .split(/[\n,]/)
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setDraft('');
      return;
    }

    const next = [...values];
    let localError: string | null = null;

    for (const part of parts) {
      const candidate = transform ? transform(part) : part;
      if (maxItems !== undefined && next.length >= maxItems) {
        localError = `Maximum ${maxItems} values`;
        break;
      }
      if (next.includes(candidate)) continue;
      const validationError = validate?.(candidate) ?? null;
      if (validationError) {
        localError = validationError;
        continue;
      }
      next.push(candidate);
    }

    if (next.length !== values.length) onChange(next);
    setError(localError);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className={className}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 p-2',
          disabled && 'opacity-50'
        )}
      >
        {values.map((value, index) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-0.5 font-mono text-sm text-slate-200"
          >
            {value}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && !atMax && (
          <input
            value={draft}
            onChange={event => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => draft.trim() && commit(draft)}
            placeholder={values.length === 0 ? placeholder : undefined}
            className="min-w-32 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {maxItems !== undefined && (
        <p className="mt-1 text-right text-xs text-slate-500">
          {values.length}/{maxItems}
        </p>
      )}
    </div>
  );
}
