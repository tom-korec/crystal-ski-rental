'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { api, type RouterOutputs } from '~/trpc/react';

interface AvailabilityToggleProps {
  ski: RouterOutputs['ski']['byId'];
  upcoming: number;
}

/**
 * Taking a ski out of rental is confirmed and warns about bookings that stay valid; offering it again is
 * undone by the same button, so it is not (BR-22).
 */
export function AvailabilityToggle({ ski, upcoming }: AvailabilityToggleProps) {
  const t = useTranslations('skiDetail');
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const update = api.ski.update.useMutation({
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([utils.ski.byId.invalidate({ id: ski.id }), utils.ski.list.invalidate()]);
    },
  });

  if (!ski.isAvailable) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          onClick={() => update.mutate({ id: ski.id, isAvailable: true })}
          disabled={update.isPending}
          data-testid="toggle-availability"
        >
          {t('offerForRental')}
        </Button>
        <FormError message={update.error?.message} />
      </div>
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) update.reset();
      }}
      trigger={<Button variant="outline" data-testid="toggle-availability" />}
      triggerLabel={t('takeOutOfRental')}
      title={t('takeOutTitle')}
      description={upcoming > 0 ? t('takeOutWithBookings', { count: upcoming }) : t('takeOutDescription')}
      confirmLabel={t('takeOutOfRental')}
      pendingLabel={t('saving')}
      cancelLabel={t('cancel')}
      onConfirm={() => update.mutate({ id: ski.id, isAvailable: false })}
      isPending={update.isPending}
      error={update.error?.message}
    />
  );
}
