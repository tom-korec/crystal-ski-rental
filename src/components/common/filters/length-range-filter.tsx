'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { MAX_LENGTH_CM, MIN_LENGTH_CM } from '~/lib/ski-schema';

const STEP_CM = 5;

export interface LengthRange {
  minLengthCm: number | undefined;
  maxLengthCm: number | undefined;
}

interface LengthRangeFilterProps {
  id: string;
  label: string;
  value: LengthRange;
  onChange: (value: LengthRange) => void;
}

/** A two-thumb slider for ski length. A thumb at its end of the scale means no limit on that side. */
export function LengthRangeFilter({ id, label, value, onChange }: LengthRangeFilterProps) {
  const t = useTranslations('filters');
  // Follow the thumbs while dragging, but only filter once they are let go.
  const [draft, setDraft] = useState<[number, number] | null>(null);

  const [min, max]: [number, number] = draft ?? [
    value.minLengthCm ?? MIN_LENGTH_CM,
    value.maxLengthCm ?? MAX_LENGTH_CM,
  ];
  const isAny = min === MIN_LENGTH_CM && max === MAX_LENGTH_CM;

  return (
    <div className="flex flex-col gap-2" data-testid={id}>
      <div className="flex items-baseline justify-between gap-2">
        <Label id={`${id}-label`}>{label}</Label>
        <span className="text-muted-foreground text-sm tabular-nums" aria-live="polite" data-testid={`${id}-value`}>
          {isAny ? t('anyLength') : t('lengthRange', { min, max })}
        </span>
      </div>
      <div className="flex h-8 items-center px-2">
        <Slider
          aria-labelledby={`${id}-label`}
          min={MIN_LENGTH_CM}
          max={MAX_LENGTH_CM}
          step={STEP_CM}
          value={[min, max]}
          thumbLabels={[t('minLength'), t('maxLength')]}
          onValueChange={(next) => setDraft(toRange(next))}
          onValueCommitted={(next) => {
            setDraft(null);
            const [nextMin, nextMax] = toRange(next);
            onChange({
              minLengthCm: nextMin === MIN_LENGTH_CM ? undefined : nextMin,
              maxLengthCm: nextMax === MAX_LENGTH_CM ? undefined : nextMax,
            });
          }}
        />
      </div>
    </div>
  );
}

function toRange(value: number | readonly number[]): [number, number] {
  return typeof value === 'number' ? [value, value] : [value[0] ?? MIN_LENGTH_CM, value[1] ?? MAX_LENGTH_CM];
}
