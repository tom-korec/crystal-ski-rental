import { useTranslations } from 'next-intl';

import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';

interface DiscountBadgeProps {
  percent: number;
  className?: string;
}

/** The longer-rental discount (BR-3), in the highlight colour. Nothing when there is none. */
export function DiscountBadge({ percent, className }: DiscountBadgeProps) {
  const t = useTranslations('skis');

  if (percent <= 0) return null;

  return (
    <Badge
      className={cn('bg-highlight text-highlight-foreground tabular-nums', className)}
      data-testid="discount-badge"
    >
      {t('discount', { percent })}
    </Badge>
  );
}
