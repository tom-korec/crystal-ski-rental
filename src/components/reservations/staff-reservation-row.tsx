'use client';

import { MessageSquareIcon, StarIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { useStaffActor } from '~/components/layout/staff-actor';
import { Button } from '~/components/ui/button';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { rentalPeriod, todayUtc } from '~/lib/date';
import { canCancelAsStore, canPickUp, canReturn } from '~/lib/reservation-lifecycle';
import { staffReservationRoute } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';
import { cn } from '~/lib/utils';

import { CustomerContact } from './customer-contact';
import { StatusBadge } from './status-badge';

export type StaffReservation = RouterOutputs['reservation']['bySki']['items'][number];

interface StaffReservationRowProps {
  reservation: StaffReservation;
  /** Leave out what the surrounding page already says: the customer on their page, the ski on its page. */
  show: { customer?: boolean; skis?: boolean; status?: boolean; rating?: boolean };
}

/**
 * One reservation as staff see it, with the lifecycle actions its status allows (FR-51, FR-60). Used by
 * the front desk and by the ski and customer histories.
 */
export function StaffReservationRow({ reservation, show }: StaffReservationRowProps) {
  const t = useTranslations('staffReservations');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const { items, user } = reservation;
  const period = formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay);

  return (
    <li
      className={cn(
        'grid gap-3 py-3 md:items-center',
        show.customer ? 'md:grid-cols-[16rem_minmax(0,1fr)_auto]' : 'md:grid-cols-[minmax(0,1fr)_auto]',
      )}
      data-testid="staff-reservation-row"
      data-reservation-id={reservation.id}
      data-status={reservation.status}
    >
      {show.customer ? <CustomerContact name={user.name} email={user.email} /> : null}

      <span className="flex flex-col gap-0.5 text-sm">
        <Link
          href={staffReservationRoute(reservation.id)}
          className="text-primary w-fit font-mono text-xs font-medium underline-offset-4 hover:underline"
          data-testid="reservation-code"
        >
          #{reservation.code}
        </Link>
        {show.skis ? (
          <ul className="flex flex-col gap-1" data-testid="reservation-skis">
            {items.map(({ id, ski }, index) => (
              <li key={id} className="flex flex-wrap items-center gap-2">
                <span
                  className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono text-xs"
                  data-testid="inventory-code"
                >
                  {ski.inventoryCode}
                </span>
                <span>
                  {ski.model.brand.name} {ski.model.name} · {t('length', { length: ski.lengthCm })}
                </span>
                {index === 0 && show.status ? <StatusBadge status={reservation.status} audience="staff" /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{period}</span>
            {items.length > 1 ? (
              <span className="text-muted-foreground text-xs">{t('pairs', { count: items.length })}</span>
            ) : null}
            {show.status ? <StatusBadge status={reservation.status} audience="staff" /> : null}
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {show.skis ? `${period} · ` : ''}
          {formatMoney(reservation.totalPrice)}
          {reservation.status === 'CANCELLED_BY_STORE' && reservation.cancelledBy
            ? ` · ${t('cancelledBy', { name: reservation.cancelledBy.name })}`
            : ''}
        </span>
        {reservation.note ? (
          <span className="flex items-start gap-1 text-xs" data-testid="reservation-note">
            <MessageSquareIcon className="text-muted-foreground mt-px size-3.5 shrink-0" aria-hidden />
            <span>“{reservation.note}”</span>
          </span>
        ) : null}
        {show.rating && reservation.rating ? (
          <span className="flex items-start gap-1 text-xs" data-testid="rental-rating">
            <StarIcon className="fill-highlight text-highlight mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              {t('rentalRating', { score: reservation.rating.score })}
              {reservation.rating.note ? (
                <span className="text-muted-foreground"> · “{reservation.rating.note}”</span>
              ) : null}
            </span>
          </span>
        ) : null}
      </span>

      <StaffReservationActions reservation={reservation} className="md:justify-end" />
    </li>
  );
}

interface StaffReservationActionsProps {
  reservation: StaffReservation;
  className?: string;
}

/**
 * The lifecycle actions a reservation's status allows, each behind a confirmation (FR-51). Offered to
 * managers only at their own store's counter (FR-64); admins and managers without a store, anywhere.
 */
export function StaffReservationActions({ reservation, className }: StaffReservationActionsProps) {
  const t = useTranslations('staffReservations');
  const formatDateRange = useFormatDateRange();
  const utils = api.useUtils();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingPickUp, setConfirmingPickUp] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);

  // Any list or page this reservation appears on may change.
  const refresh = () =>
    Promise.all([
      utils.reservation.frontDesk.invalidate(),
      utils.reservation.bySki.invalidate(),
      utils.reservation.byUser.invalidate(),
      utils.reservation.search.invalidate(),
      utils.reservation.byId.invalidate({ id: reservation.id }),
      utils.reservation.blockersBySki.invalidate(),
    ]);
  const pickUp = api.reservation.pickUp.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirmingPickUp(false);
    },
  });
  const markReturned = api.reservation.markReturned.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirmingReturn(false);
    },
  });
  const cancel = api.reservation.cancel.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirmingCancel(false);
    },
  });

  const { items, user } = reservation;
  const skis = items.map(({ ski }) => `${ski.model.brand.name} ${ski.model.name} (${ski.inventoryCode})`).join(', ');
  const period = formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay);
  const today = todayUtc();
  const { storeId: ownStore } = useStaffActor();
  const atOwnCounter = !ownStore || reservation.store.id === ownStore;

  return (
    <span className={cn('flex flex-wrap items-center gap-2', className)}>
      {atOwnCounter && canPickUp(reservation, today) ? (
        <ConfirmDialog
          open={confirmingPickUp}
          onOpenChange={(open) => {
            setConfirmingPickUp(open);
            if (!open) pickUp.reset();
          }}
          trigger={<Button size="sm" data-testid="pick-up" />}
          triggerLabel={t('pickUp')}
          title={t('pickUpTitle', { count: items.length })}
          description={t('pickUpDescription', { customer: user.name, skis, period, count: items.length })}
          confirmLabel={t('pickUpConfirm')}
          pendingLabel={t('working')}
          cancelLabel={t('notYet')}
          onConfirm={() => pickUp.mutate({ id: reservation.id })}
          isPending={pickUp.isPending}
          error={pickUp.error?.message}
        />
      ) : null}
      {atOwnCounter && canReturn(reservation) ? (
        <ConfirmDialog
          open={confirmingReturn}
          onOpenChange={(open) => {
            setConfirmingReturn(open);
            if (!open) markReturned.reset();
          }}
          trigger={<Button size="sm" data-testid="mark-returned" />}
          triggerLabel={t('markReturned')}
          title={t('returnTitle')}
          description={t('returnDescription', { customer: user.name, skis, count: items.length })}
          confirmLabel={t('returnConfirm')}
          pendingLabel={t('working')}
          cancelLabel={t('notYet')}
          onConfirm={() => markReturned.mutate({ id: reservation.id })}
          isPending={markReturned.isPending}
          error={markReturned.error?.message}
        />
      ) : null}
      {atOwnCounter && canCancelAsStore(reservation) ? (
        <ConfirmDialog
          open={confirmingCancel}
          onOpenChange={(open) => {
            setConfirmingCancel(open);
            if (!open) cancel.reset();
          }}
          trigger={<Button size="sm" variant="ghost" className="text-destructive" data-testid="cancel-booking" />}
          triggerLabel={t('cancel')}
          title={t('cancelTitle')}
          description={t('cancelDescription', { customer: user.name, skis, period })}
          confirmLabel={t('cancelConfirm')}
          pendingLabel={t('working')}
          cancelLabel={t('keep')}
          onConfirm={() => cancel.mutate({ id: reservation.id })}
          isPending={cancel.isPending}
          error={cancel.error?.message}
          destructive
        />
      ) : null}
    </span>
  );
}
