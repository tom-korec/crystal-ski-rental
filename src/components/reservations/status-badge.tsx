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
  /** Customers read "cancelled by you"; staff read who cancelled. */
  audience?: 'customer' | 'staff';
}

export function StatusBadge({ status, audience = 'customer' }: StatusBadgeProps) {
  const t = useTranslations('reservations');

  return (
    <Badge variant={VARIANT[status]} data-testid="reservation-status" data-status={status}>
      {audience === 'staff' ? t(`staffStatus.${status}`) : t(`status.${status}`)}
    </Badge>
  );
}
