'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { SelectField } from '~/components/common/select-field';
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
import { inventoryCodeSchema } from '~/lib/ski-schema';
import { api, type RouterOutputs } from '~/trpc/react';

/** Model and length are fixed; a form that shows the other fields always submits them (FR-22). */
const editSkiSchema = z.object({ id: z.uuid(), inventoryCode: inventoryCodeSchema, storeId: z.uuid() });

type EditSkiInput = z.input<typeof editSkiSchema>;
type EditSkiOutput = z.output<typeof editSkiSchema>;

interface EditSkiDialogProps {
  ski: RouterOutputs['ski']['byId'];
  blockers: RouterOutputs['reservation']['blockersBySki'] | undefined;
}

export function EditSkiDialog({ ski, blockers }: EditSkiDialogProps) {
  const t = useTranslations('skiDetail');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" data-testid="edit-ski" />}>
        <PencilIcon aria-hidden />
        {t('edit')}
      </DialogTrigger>
      <DialogContent data-testid="edit-ski-dialog">
        {open ? <EditSkiForm ski={ski} blockers={blockers} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditSkiForm({ ski, blockers, onDone }: EditSkiDialogProps & { onDone: () => void }) {
  const t = useTranslations('skiDetail');
  const tFleet = useTranslations('fleet');
  const utils = api.useUtils();
  const stores = api.store.list.useQuery();

  const form = useForm<EditSkiInput, unknown, EditSkiOutput>({
    resolver: zodResolver(editSkiSchema),
    defaultValues: { id: ski.id, inventoryCode: ski.inventoryCode, storeId: ski.store.id },
  });
  const { errors } = form.formState;

  const update = api.ski.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.ski.byId.invalidate({ id: ski.id }), utils.ski.list.invalidate()]);
      onDone();
    },
  });

  // A customer expects the skis where they booked them, so the store is locked while bookings stand (BR-30).
  const openAtStore = (blockers?.upcoming ?? 0) + (blockers?.active ?? 0);

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
      <DialogHeader>
        <DialogTitle>{t('editTitle')}</DialogTitle>
        <DialogDescription>{t('editDescription')}</DialogDescription>
      </DialogHeader>

      <Field
        id="edit-inventory-code"
        label={tFleet('inventoryCode')}
        autoComplete="off"
        error={errors.inventoryCode && tFleet('errors.inventoryCode')}
        {...form.register('inventoryCode')}
      />
      <Controller
        control={form.control}
        name="storeId"
        render={({ field }) => (
          <SelectField
            id="edit-store"
            label={tFleet('store')}
            placeholder={tFleet('selectStore')}
            options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
            value={field.value}
            onChange={field.onChange}
            disabled={stores.isPending || openAtStore > 0}
            hint={openAtStore > 0 ? t('storeLocked', { count: openAtStore }) : undefined}
            error={errors.storeId && tFleet('errors.store')}
          />
        )}
      />

      <FormError message={update.error?.message} />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={update.isPending} data-testid="save-ski">
          {update.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
