'use client';

import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

import type { FilterOption } from './filters/select-filter';

interface SelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  hint?: string;
}

/** A required choice in a form, labelled and with its error announced like `Field`. */
export function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  disabled,
  hint,
}: SelectFieldProps) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label id={labelId} htmlFor={id}>
        {label}
      </Label>
      <Select items={options} value={value ?? null} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger
          id={id}
          aria-labelledby={`${labelId} ${id}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className="w-full"
          data-testid={id}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
