'use client';

import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

const DEBOUNCE_MS = 300;

interface SearchFilterProps {
  id: string;
  label: string;
  placeholder: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

/** Free text, reported once typing pauses, so each keystroke does not become a request. */
export function SearchFilter({ id, label, placeholder, value, onChange }: SearchFilterProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [syncedValue, setSyncedValue] = useState(value);
  const latest = useRef({ onChange, value });

  // The value can change from outside, e.g. "Clear filters" or Back; the input follows it.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value ?? '');
  }

  useEffect(() => {
    latest.current = { onChange, value };
  });

  useEffect(() => {
    const next = draft.trim() || undefined;
    if (next === latest.current.value) return;

    const timer = setTimeout(() => latest.current.onChange(next), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="ps-8"
          data-testid={id}
        />
      </div>
    </div>
  );
}
