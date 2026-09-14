import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RatingSummaryProps {
  avgRating: number | null;
  ratingCount: number;
}

export function RatingSummary({ avgRating, ratingCount }: RatingSummaryProps) {
  const t = useTranslations('skis');

  if (avgRating === null) return <span className="text-muted-foreground">{t('notRated')}</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <StarIcon className="fill-highlight text-highlight size-4" aria-hidden />
      {t('rating', { score: avgRating.toFixed(1), count: ratingCount })}
    </span>
  );
}
