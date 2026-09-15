'use client';

import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MAX_SCORE, MIN_SCORE } from '~/lib/rating-rules';
import { cn } from '~/lib/utils';

interface ScoreInputProps {
  name: string;
  label: string;
  value: number | undefined;
  onChange: (score: number) => void;
  error?: string;
}

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index);

/** Five stars built on native radio buttons, so arrow keys and screen readers work as for any radio group. */
export function ScoreInput({ name, label, value, onChange, error }: ScoreInputProps) {
  const t = useTranslations('ratings');
  const errorId = `${name}-error`;
  // Hovering previews the score the pointer is on, stars below it included.
  const [hovered, setHovered] = useState<number>();
  const shown = hovered ?? value;

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex w-fit gap-1" onMouseLeave={() => setHovered(undefined)}>
        {SCORES.map((score) => (
          <label
            key={score}
            className="relative cursor-pointer"
            onMouseEnter={() => setHovered(score)}
            data-testid={`${name}-${score}`}
          >
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              className="peer sr-only"
            />
            <StarIcon
              aria-hidden
              className={cn(
                'peer-focus-visible:ring-ring/50 size-8 rounded-md p-0.5 transition-[color,fill,transform] peer-focus-visible:ring-3',
                shown !== undefined && score <= shown ? 'fill-highlight text-highlight' : 'text-muted-foreground',
                hovered !== undefined && score <= hovered && 'scale-110',
              )}
            />
            <span className="sr-only">{t('stars', { score })}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
