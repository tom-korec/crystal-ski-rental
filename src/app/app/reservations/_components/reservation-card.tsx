'use client';

import { ChevronDownIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { StatusBadge } from '~/components/reservations/status-badge';
import { DiscountBadge } from '~/components/skis/discount-badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { formatPostalCode } from '~/lib/address-schema';
import { rentalPeriod, todayUtc } from '~/lib/date';
import { Money } from '~/lib/money';
import { editWindowEndsAt, modelRatingAccess, ratingAction, reservationRatingAccess } from '~/lib/rating-rules';
import { canCancelAsUser } from '~/lib/reservation-lifecycle';
import { appStoreRoute } from '~/lib/routes';
import { cn } from '~/lib/utils';
import type { RouterOutputs } from '~/trpc/react';
import { api } from '~/trpc/react';

import { type ModelRatingPart, RatingDialog, type RatingPart } from './rating-dialog';
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

  const { items, store, rating, modelRatings } = reservation;
  const names = items.map(({ ski }) => `${ski.model.brand.name} ${ski.model.name}`);
  const skis = names.join(', ');
  const period = formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay);
  const now = new Date();
  // Before the discount, so each line reads as price per day × days (BR-4).
  const subtotal = items.reduce(
    (sum, item) => sum.plus(new Money(item.pricePerDay).times(reservation.rentalDays)),
    new Money(0),
  );

  const rental: RatingPart = {
    access: reservationRatingAccess(reservation, rating, now),
    current: rating && { score: rating.score, text: rating.note },
    editableUntil: rating ? editWindowEndsAt(rating.createdAt) : null,
  };
  // One rating part per distinct model: two pairs of the same model share one rating.
  const models = [...new Map(items.map(({ ski }) => [ski.model.id, ski.model])).values()].map(
    (model): ModelRatingPart => {
      const current = modelRatings.find((candidate) => candidate.modelId === model.id) ?? null;
      return {
        modelId: model.id,
        name: `${model.brand.name} ${model.name}`,
        access: modelRatingAccess(reservation, current, now),
        current: current && { score: current.score, text: current.comment },
        // A window opened through another rental is not this reservation's to edit.
        editableUntil: current?.reservationId === reservation.id ? editWindowEndsAt(current.windowStartedAt) : null,
      };
    },
  );
  const action = ratingAction(
    rental.access,
    models.map((model) => model.access),
  );
  const ratedModels = models.filter((model) => model.current);
  const hasRatings = reservation.status === 'RETURNED' && (rating !== null || ratedModels.length > 0);

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
            <span className="text-muted-foreground truncate text-sm" data-testid="reservation-skis">
              {items.length === 1 && items[0]
                ? `${skis} · ${t('length', { length: items[0].ski.lengthCm })}`
                : t('pairsOf', { count: items.length, skis })}{' '}
              · {store.name}
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
                {ratedModels.length === 1 && models.length === 1 && ratedModels[0]?.current ? (
                  <>
                    <dt className="text-muted-foreground">{t('ratingSkis')}</dt>
                    <dd>
                      <StarScore score={ratedModels[0].current.score} data-testid="model-score" />
                    </dd>
                  </>
                ) : ratedModels.length > 0 ? (
                  <>
                    <dt className="text-muted-foreground">{t('ratingSkis')}</dt>
                    <dd className="text-muted-foreground" data-testid="models-rated">
                      {t('modelsRated', { rated: ratedModels.length, total: models.length })}
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
                store={store.name}
                rental={rental}
                models={models}
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

        <CollapsibleContent className="border-border flex flex-col gap-4 border-t px-4 py-4 text-sm">
          <p>{statusHint(t, reservation, period)}</p>
          <ul className="flex flex-col gap-2" data-testid="reservation-items">
            {items.map(({ id, ski, pricePerDay }) => {
              const modelRating = models.find((model) => model.modelId === ski.model.id)?.current;
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {ski.model.brand.name} {ski.model.name}
                    </span>
                    <span className="text-muted-foreground">{t('length', { length: ski.lengthCm })}</span>
                    {reservation.status === 'RETURNED' && modelRating ? <StarScore score={modelRating.score} /> : null}
                  </span>
                  <span className="flex items-baseline gap-3 tabular-nums">
                    <span className="text-muted-foreground text-xs">
                      {t('perDayTimesDays', { price: formatMoney(pricePerDay), days: reservation.rentalDays })}
                    </span>
                    <span>{formatMoney(new Money(pricePerDay).times(reservation.rentalDays).toFixed(2))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <ReservationAddresses addresses={reservation.addresses} />
          {reservation.note ? (
            <p data-testid="reservation-note">
              <span className="text-muted-foreground">{t('note')}: </span>“{reservation.note}”
            </p>
          ) : null}
          <dl
            className="border-border grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 tabular-nums sm:max-w-sm sm:self-end"
            data-testid="reservation-price"
          >
            <dt className="text-muted-foreground">{t('subtotal')}</dt>
            <dd className="text-right">{formatMoney(subtotal.toFixed(2))}</dd>
            {reservation.discountPercent > 0 ? (
              <>
                <dt className="text-muted-foreground flex flex-wrap items-center gap-2">
                  {t('discount', { days: reservation.rentalDays })}
                  <DiscountBadge percent={reservation.discountPercent} />
                </dt>
                <dd className="text-right">−{formatMoney(subtotal.minus(reservation.totalPrice).toFixed(2))}</dd>
              </>
            ) : null}
            <dt className="font-medium">{t('total')}</dt>
            <dd className="text-right font-semibold">{formatMoney(reservation.totalPrice)}</dd>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={appStoreRoute(store.id)} />}
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
      return t('hint.created', { store: reservation.store.name });
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

interface ReservationAddressesProps {
  addresses: MyReservation['addresses'];
}

/** The addresses the reservation was booked with, as they were then (FR-36). */
function ReservationAddresses({ addresses }: ReservationAddressesProps) {
  const t = useTranslations('reservations');
  const locale = useLocale();
  const countries = new Intl.DisplayNames([locale], { type: 'region' });
  const mailing = addresses.find((address) => address.kind === 'MAILING');
  const invoice = addresses.find((address) => address.kind === 'INVOICE');

  if (!mailing) return null;

  const line = (address: MyReservation['addresses'][number]) =>
    [
      address.recipient,
      `${address.street} ${address.houseNumber}`,
      `${formatPostalCode(address.zipCode, address.country)} ${address.city}`,
      countries.of(address.country),
      address.companyId && t('companyId', { id: address.companyId }),
      address.vatId && t('vatId', { id: address.vatId }),
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]" data-testid="reservation-addresses">
      <dt className="text-muted-foreground">{t('mailingAddress')}</dt>
      <dd>{line(mailing)}</dd>
      <dt className="text-muted-foreground">{t('invoiceAddress')}</dt>
      <dd>{invoice ? line(invoice) : t('invoiceToMailing')}</dd>
    </dl>
  );
}
