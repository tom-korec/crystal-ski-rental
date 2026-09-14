'use client';

import { InfoIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { StatusBadge } from '~/components/reservations/status-badge';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { rentalPeriod, todayUtc } from '~/lib/date';
import { editWindowEndsAt, modelRatingAccess, reservationRatingAccess } from '~/lib/rating-rules';
import { canCancelAsUser } from '~/lib/reservation-lifecycle';
import type { RouterOutputs } from '~/trpc/react';
import { api } from '~/trpc/react';

import { RatingControl } from './rating-control';

export type MyReservation = RouterOutputs['reservation']['listMine']['items'][number];

interface ReservationCardProps {
  reservation: MyReservation;
}

export function ReservationCard({ reservation }: ReservationCardProps) {
  const t = useTranslations('reservations');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState(false);

  const cancel = api.reservation.cancel.useMutation({
    onSuccess: async () => {
      await utils.reservation.listMine.invalidate();
      setConfirming(false);
    },
  });

  const { ski } = reservation;
  const skis = `${ski.model.brand.name} ${ski.model.name}`;
  const { lastDay } = rentalPeriod(reservation);
  const period = formatDateRange(reservation.startDate, lastDay);
  const now = new Date();

  const rentalAccess = reservationRatingAccess(reservation, reservation.rating, now);
  const modelAccess = modelRatingAccess(reservation, reservation.modelRating, now);
  const modelWindowIsThis = reservation.modelRating?.reservationId === reservation.id;

  return (
    <Card data-testid="reservation-card" data-reservation-id={reservation.id} data-status={reservation.status}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{period}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {skis} · {t('length', { length: ski.lengthCm })}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p>
              <span className="text-muted-foreground">{t('store')}: </span>
              {ski.store.name}, {ski.store.city}
            </p>
            <p className="text-muted-foreground">{statusHint(t, reservation, period)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-lg font-semibold tabular-nums" data-testid="reservation-total">
              {formatMoney(reservation.totalPrice)}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('priceSummary', {
                days: reservation.rentalDays,
                price: formatMoney(reservation.pricePerDay),
                discount: reservation.discountPercent,
              })}
            </p>
          </div>
        </div>

        <div className="border-border flex flex-wrap items-center gap-2 border-t pt-3">
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" size="sm" />}>
              <InfoIcon aria-hidden />
              {t('storeDetails')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{ski.store.name}</DialogTitle>
                <DialogDescription>{t('storeDetailsDescription')}</DialogDescription>
              </DialogHeader>
              <StoreDetails store={ski.store} />
            </DialogContent>
          </Dialog>

          {canCancelAsUser(reservation, todayUtc()) ? (
            <ConfirmDialog
              open={confirming}
              onOpenChange={(open) => {
                setConfirming(open);
                if (!open) cancel.reset();
              }}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive" data-testid="cancel-reservation" />
              }
              triggerLabel={t('cancelConfirm')}
              title={t('cancelTitle')}
              description={t('cancelDescription', { skis, period })}
              confirmLabel={t('cancelConfirm')}
              pendingLabel={t('cancelling')}
              cancelLabel={t('keep')}
              onConfirm={() => cancel.mutate({ id: reservation.id })}
              isPending={cancel.isPending}
              error={cancel.error?.message}
              destructive
            />
          ) : null}

          <div className="ms-auto flex flex-wrap items-center gap-3">
            <RatingControl
              kind="rental"
              reservationId={reservation.id}
              subject={ski.store.name}
              access={rentalAccess}
              current={reservation.rating && { score: reservation.rating.score, text: reservation.rating.note }}
              editableUntil={reservation.rating ? editWindowEndsAt(reservation.rating.createdAt) : null}
            />
            <RatingControl
              kind="model"
              reservationId={reservation.id}
              subject={skis}
              access={modelAccess}
              current={
                reservation.modelRating && {
                  score: reservation.modelRating.score,
                  text: reservation.modelRating.comment,
                }
              }
              editableUntil={
                reservation.modelRating && modelWindowIsThis
                  ? editWindowEndsAt(reservation.modelRating.windowStartedAt)
                  : null
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function statusHint(
  t: ReturnType<typeof useTranslations<'reservations'>>,
  reservation: MyReservation,
  period: string,
): string {
  switch (reservation.status) {
    case 'CREATED':
      return t('hint.created', { store: reservation.ski.store.name });
    case 'ACTIVE':
      return t('hint.active');
    case 'RETURNED':
      return t('hint.returned');
    case 'CANCELLED_BY_USER':
      return t('hint.cancelledByUser', { period });
    case 'CANCELLED_BY_STORE':
      return t('hint.cancelledByStore');
  }
}
