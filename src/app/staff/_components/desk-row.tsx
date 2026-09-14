'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { FormError } from '~/components/common/form-error';
import { CustomerContact } from '~/components/reservations/customer-contact';
import { Button } from '~/components/ui/button';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { rentalPeriod, todayUtc } from '~/lib/date';
import { canCancelAsStore, canPickUp, canReturn } from '~/lib/reservation-lifecycle';
import { api, type RouterOutputs } from '~/trpc/react';

export type DeskReservation = RouterOutputs['reservation']['frontDesk']['pickupsDueToday'][number];

interface DeskRowProps {
  reservation: DeskReservation;
}

/** One reservation at the counter, with the actions its status allows (FR-51). */
export function DeskRow({ reservation }: DeskRowProps) {
  const t = useTranslations('frontDesk');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const utils = api.useUtils();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const refresh = () => utils.reservation.frontDesk.invalidate();
  const pickUp = api.reservation.pickUp.useMutation({ onSuccess: refresh });
  const markReturned = api.reservation.markReturned.useMutation({ onSuccess: refresh });
  const cancel = api.reservation.cancel.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirmingCancel(false);
    },
  });

  const { ski, user } = reservation;
  const skis = `${ski.model.brand.name} ${ski.model.name}`;
  const period = formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay);
  const today = todayUtc();
  const error = pickUp.error?.message ?? markReturned.error?.message;

  return (
    <li
      className="grid gap-3 py-3 md:grid-cols-[16rem_minmax(0,1fr)_auto] md:items-center"
      data-testid="desk-row"
      data-reservation-id={reservation.id}
    >
      <CustomerContact name={user.name} email={user.email} />

      <span className="flex flex-col text-sm">
        <span>
          <span
            className="bg-secondary text-secondary-foreground me-2 rounded px-1.5 py-0.5 font-mono text-xs"
            data-testid="inventory-code"
          >
            {ski.inventoryCode}
          </span>
          {skis} · {t('length', { length: ski.lengthCm })}
        </span>
        <span className="text-muted-foreground text-xs">
          {period} · {formatMoney(reservation.totalPrice)}
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-2 md:justify-end">
        {canPickUp(reservation, today) ? (
          <Button
            size="sm"
            onClick={() => pickUp.mutate({ id: reservation.id })}
            disabled={pickUp.isPending}
            data-testid="pick-up"
          >
            {pickUp.isPending ? t('working') : t('pickUp')}
          </Button>
        ) : null}
        {canReturn(reservation) ? (
          <Button
            size="sm"
            onClick={() => markReturned.mutate({ id: reservation.id })}
            disabled={markReturned.isPending}
            data-testid="mark-returned"
          >
            {markReturned.isPending ? t('working') : t('markReturned')}
          </Button>
        ) : null}
        {canCancelAsStore(reservation) ? (
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

      {error ? (
        <div className="md:col-span-3">
          <FormError message={error} />
        </div>
      ) : null}
    </li>
  );
}
