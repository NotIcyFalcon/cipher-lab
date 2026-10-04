"use client";

import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export function TextField({
  label,
  value,
  onChange,
  required = false,
  maxLength = 200,
  placeholder,
  multiline = false,
  code = false,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  code?: boolean;
  rows?: number;
}) {
  return (
    <label className="creator-field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      {multiline ? (
        <textarea
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
          spellCheck={!code}
          className={code ? "creator-code" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1_000_000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="creator-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        required
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="creator-field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="creator-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function ListControls({
  label,
  index,
  length,
  onMove,
  onRemove,
  reorder = true,
}: {
  label: string;
  index: number;
  length: number;
  onMove?: (direction: -1 | 1) => void;
  onRemove: () => void;
  reorder?: boolean;
}) {
  return (
    <div className="creator-list-controls">
      {reorder && (
        <>
          <button
            type="button"
            className="creator-icon-button"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onMove?.(-1)}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="creator-icon-button"
            aria-label={`Move ${label} down`}
            disabled={index === length - 1}
            onClick={() => onMove?.(1)}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </>
      )}

      <button
        type="button"
        className="creator-icon-button creator-danger-text"
        aria-label={`Remove ${label}`}
        onClick={() => {
          if (window.confirm(`Remove ${label}? This removal is applied when you save.`)) {
            onRemove();
          }
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
