'use client';

import { Trash2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { STAFF_SKIS } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';

interface DeleteSkiDialogProps {
  ski: RouterOutputs['ski']['byId'];
  /** Booked or picked-up reservations, counted over the whole history rather than the page on screen. */
  open: number | undefined;
}

/** Refused while the ski is booked or out; with history it is removed but kept for the records (BR-31, BR-32). */
export function DeleteSkiDialog({ ski, open: openReservations }: DeleteSkiDialogProps) {
  const t = useTranslations('skiDetail');
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const remove = api.ski.delete.useMutation({
    onSuccess: async () => {
      await utils.ski.list.invalidate();
      router.replace(STAFF_SKIS);
    },
  });

  const blocked = (openReservations ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) remove.reset();
      }}
    >
      <DialogTrigger render={<Button variant="destructive" data-testid="delete-ski" />}>
        <Trash2Icon aria-hidden />
        {t('delete')}
      </DialogTrigger>
      <DialogContent data-testid="delete-ski-dialog">
        <DialogHeader>
          <DialogTitle>{t('deleteTitle', { code: ski.inventoryCode })}</DialogTitle>
          <DialogDescription>
            {blocked ? t('deleteBlocked', { count: openReservations ?? 0 }) : t('deleteDescription')}
          </DialogDescription>
        </DialogHeader>
        <FormError message={remove.error?.message} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t('cancel')}</DialogClose>
          {blocked ? null : (
            <Button
              variant="destructive"
              onClick={() => remove.mutate({ id: ski.id })}
              disabled={remove.isPending}
              data-testid="confirm-delete"
            >
              {remove.isPending ? t('deleting') : t('delete')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
