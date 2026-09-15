'use client';

import { ChevronDownIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { StatusBadge } from '~/components/reservations/status-badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { rentalPeriod, todayUtc } from '~/lib/date';
import { editWindowEndsAt, modelRatingAccess, ratingAction, reservationRatingAccess } from '~/lib/rating-rules';
import { canCancelAsUser } from '~/lib/reservation-lifecycle';
import { appStoreRoute } from '~/lib/routes';
import { cn } from '~/lib/utils';
import type { RouterOutputs } from '~/trpc/react';
import { api } from '~/trpc/react';

import { RatingDialog, type RatingPart } from './rating-dialog';
import { StarScore } from './star-score';

export type MyReservation = RouterOutputs['reservation']['listMine']['items'][number];

interface ReservationCardProps {
  reservation: MyReservation;
}

/** One reservation: the essentials in a single row, the rest folded away. */
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
  const period = formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay);
  const now = new Date();

  const { rating, modelRating } = reservation;
  const rental: RatingPart = {
    access: reservationRatingAccess(reservation, rating, now),
    current: rating && { score: rating.score, text: rating.note },
    editableUntil: rating ? editWindowEndsAt(rating.createdAt) : null,
  };
  const model: RatingPart = {
    access: modelRatingAccess(reservation, modelRating, now),
    current: modelRating && { score: modelRating.score, text: modelRating.comment },
    // A window opened through another rental is not this reservation's to edit.
    editableUntil: modelRating?.reservationId === reservation.id ? editWindowEndsAt(modelRating.windowStartedAt) : null,
  };
  const action = ratingAction(rental.access, model.access);
  const hasRatings = reservation.status === 'RETURNED' && Boolean(rating ?? modelRating);

  return (
    <Card
      className="gap-0 py-0"
      data-testid="reservation-card"
      data-reservation-id={reservation.id}
      data-status={reservation.status}
    >
      <Collapsible>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_9rem_8.5rem_5.5rem_12rem]">
          <div className="flex w-full min-w-0 flex-col md:w-auto">
            <span className="font-medium">{period}</span>
            <span className="text-muted-foreground truncate text-sm">
              {skis} · {t('length', { length: ski.lengthCm })} · {ski.store.name}
            </span>
          </div>

          <div className={cn(!hasRatings && 'hidden md:block')}>
            {hasRatings ? (
              <dl
                className="grid grid-cols-[auto_auto] items-center justify-start gap-x-2 text-xs"
                data-testid="reservation-ratings"
              >
                {rating ? (
                  <>
                    <dt className="text-muted-foreground">{t('ratingRental')}</dt>
                    <dd>
                      <StarScore score={rating.score} data-testid="rental-score" />
                    </dd>
                  </>
                ) : null}
                {modelRating ? (
                  <>
                    <dt className="text-muted-foreground">{t('ratingSkis')}</dt>
                    <dd>
                      <StarScore score={modelRating.score} data-testid="model-score" />
                    </dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </div>

          <div>
            <StatusBadge status={reservation.status} />
          </div>

          <span className="font-semibold tabular-nums md:text-right" data-testid="reservation-total">
            {formatMoney(reservation.totalPrice)}
          </span>

          <div className="ms-auto flex items-center justify-end gap-2">
            {action ? (
              <RatingDialog
                action={action}
                reservationId={reservation.id}
                store={ski.store.name}
                skis={skis}
                rental={rental}
                model={model}
              />
            ) : null}
            <CollapsibleTrigger
              render={<Button variant="ghost" size="sm" className="group" data-testid="reservation-details" />}
            >
              {t('details')}
              <ChevronDownIcon className="transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="border-border flex flex-col gap-3 border-t px-4 py-4 text-sm">
          <p>{statusHint(t, reservation, period)}</p>
          <p className="text-muted-foreground">
            {t('priceSummary', {
              days: reservation.rentalDays,
              price: formatMoney(reservation.pricePerDay),
              discount: reservation.discountPercent,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={appStoreRoute(ski.store.id)} />}
              data-testid="store-details-link"
            >
              <MapPinIcon aria-hidden />
              {t('storeDetails')}
            </Button>
            {canCancelAsUser(reservation, todayUtc()) ? (
              <ConfirmDialog
                open={confirming}
                onOpenChange={(open) => {
                  setConfirming(open);
                  if (!open) cancel.reset();
                }}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive w-fit"
                    data-testid="cancel-reservation"
                  />
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
          </div>
        </CollapsibleContent>
      </Collapsible>
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
