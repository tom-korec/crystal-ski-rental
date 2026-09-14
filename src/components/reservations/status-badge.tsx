import { useTranslations } from 'next-intl';

import { Badge } from '~/components/ui/badge';
import type { ReservationStatus } from '~/lib/reservation-lifecycle';

const VARIANT: Record<ReservationStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  CREATED: 'secondary',
  ACTIVE: 'default',
  RETURNED: 'outline',
  CANCELLED_BY_USER: 'outline',
  CANCELLED_BY_STORE: 'destructive',
};

interface StatusBadgeProps {
  status: ReservationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('reservations.status');

  return (
    <Badge variant={VARIANT[status]} data-testid="reservation-status" data-status={status}>
      {t(status)}
    </Badge>
  );
}
