import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MAX_SCORE, MIN_SCORE } from '~/lib/rating-rules';
import { cn } from '~/lib/utils';

interface StarScoreProps {
  score: number;
  className?: string;
  'data-testid'?: string;
}

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index);

/** A saved score as a row of stars. */
export function StarScore({ score, className, 'data-testid': testId }: StarScoreProps) {
  const t = useTranslations('ratings');

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} data-score={score} data-testid={testId}>
      {SCORES.map((star) => (
        <StarIcon
          key={star}
          aria-hidden
          className={cn('size-4', star <= score ? 'fill-highlight text-highlight' : 'text-muted-foreground/40')}
        />
      ))}
      <span className="sr-only">{t('stars', { score })}</span>
    </span>
  );
}
