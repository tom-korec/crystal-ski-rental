'use client';

import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

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

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex gap-1">
        {SCORES.map((score) => (
          <label key={score} className="group relative cursor-pointer" data-testid={`${name}-${score}`}>
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
                'peer-focus-visible:ring-ring/50 size-8 rounded-md p-0.5 transition-colors peer-focus-visible:ring-3',
                value !== undefined && score <= value
                  ? 'fill-highlight text-highlight'
                  : 'text-muted-foreground group-hover:text-highlight',
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
