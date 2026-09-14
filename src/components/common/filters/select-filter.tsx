'use client';

import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  id: string;
  label: string;
  /** The label of the "no filter" choice. */
  anyLabel: string;
  options: FilterOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function SelectFilter({ id, label, anyLabel, options, value, onChange, disabled }: SelectFilterProps) {
  const labelId = `${id}-label`;
  const items = [{ value: null, label: anyLabel }, ...options];

  return (
    <div className="flex flex-col gap-2">
      <Label id={labelId} htmlFor={id}>
        {label}
      </Label>
      <Select items={items} value={value ?? null} onValueChange={(next) => onChange(next ?? undefined)}>
        <SelectTrigger id={id} aria-labelledby={`${labelId} ${id}`} disabled={disabled} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value ?? 'any'} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
