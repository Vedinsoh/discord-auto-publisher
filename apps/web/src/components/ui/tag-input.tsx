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
 * click ✕ or Backspace-on-empty to remove. Click a chip to edit it in place
 * (Enter/blur commits, Escape cancels). Dedupes and enforces an optional max
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

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

  const startEditing = (index: number) => {
    if (disabled) return;
    setEditingIndex(index);
    setEditDraft(values[index]);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditDraft('');
  };

  const commitEdit = (index: number) => {
    const raw = editDraft.trim();
    // Empty edit removes the chip.
    if (raw === '') {
      onChange(values.filter((_, i) => i !== index));
      cancelEditing();
      return;
    }
    const candidate = transform ? transform(raw) : raw;
    if (candidate === values[index]) {
      cancelEditing();
      return;
    }
    // Dedupe against every other chip (allow keeping the same value at this slot).
    if (values.some((value, i) => i !== index && value === candidate)) {
      onChange(values.filter((_, i) => i !== index));
      cancelEditing();
      return;
    }
    const validationError = validate?.(candidate) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    onChange(values.map((value, i) => (i === index ? candidate : value)));
    setError(null);
    cancelEditing();
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit(index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
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
        {values.map((value, index) =>
          editingIndex === index ? (
            <input
              // biome-ignore lint/suspicious/noArrayIndexKey: editing a fixed slot
              key={`edit-${index}`}
              // biome-ignore lint/a11y/noAutofocus: focus the chip the user clicked to edit
              autoFocus
              value={editDraft}
              onChange={event => {
                setEditDraft(event.target.value);
                setError(null);
              }}
              onKeyDown={event => handleEditKeyDown(event, index)}
              onBlur={() => commitEdit(index)}
              className="min-w-16 rounded-md border border-blue-500/60 bg-slate-900 px-2 py-0.5 font-mono text-sm text-white outline-none"
              style={{ width: `${Math.max(editDraft.length + 1, 3)}ch` }}
            />
          ) : (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-0.5 font-mono text-sm text-slate-200"
            >
              {disabled ? (
                value
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(index)}
                  className="cursor-text rounded-sm hover:text-white"
                  title="Click to edit"
                >
                  {value}
                </button>
              )}
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
          )
        )}
        {!disabled && !atMax && editingIndex === null && (
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
