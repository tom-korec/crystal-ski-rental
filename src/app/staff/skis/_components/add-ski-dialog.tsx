'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

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
import { staffSkiRoute } from '~/lib/routes';
import { MAX_LENGTH_CM, MIN_LENGTH_CM, skiCreateSchema } from '~/lib/ski-schema';
import { useStaffActor } from '~/components/layout/staff-actor';
import { isAdmin } from '~/lib/roles';
import { api } from '~/trpc/react';

type AddSkiInput = z.input<typeof skiCreateSchema>;
type AddSkiOutput = z.output<typeof skiCreateSchema>;

/** Add a physical pair to the fleet (FR-21). */
export function AddSkiDialog() {
  const t = useTranslations('fleet');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button data-testid="add-ski" />}>
        <PlusIcon aria-hidden />
        {t('add')}
      </DialogTrigger>
      <DialogContent data-testid="add-ski-dialog">{open ? <AddSkiForm /> : null}</DialogContent>
    </Dialog>
  );
}

function AddSkiForm() {
  const t = useTranslations('fleet');
  const router = useRouter();
  const utils = api.useUtils();
  const stores = api.store.list.useQuery();
  const models = api.skiModel.list.useQuery({});
  // A manager adds skis to their own store only (FR-64).
  const actor = useStaffActor();
  const ownStore = isAdmin(actor.role) ? undefined : (actor.storeId ?? undefined);

  const form = useForm<AddSkiInput, unknown, AddSkiOutput>({
    resolver: zodResolver(skiCreateSchema),
    defaultValues: { inventoryCode: '', isAvailable: true, storeId: ownStore },
  });
  const { errors } = form.formState;

  const create = api.ski.create.useMutation({
    onSuccess: async (ski) => {
      await utils.ski.list.invalidate();
      router.push(staffSkiRoute(ski.id));
    },
  });

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
      <DialogHeader>
        <DialogTitle>{t('addTitle')}</DialogTitle>
        <DialogDescription>{t('addDescription')}</DialogDescription>
      </DialogHeader>

      <Field
        id="ski-inventory-code"
        label={t('inventoryCode')}
        placeholder="SK-0142"
        autoComplete="off"
        error={errors.inventoryCode && t('errors.inventoryCode')}
        {...form.register('inventoryCode')}
      />
      <Controller
        control={form.control}
        name="modelId"
        render={({ field }) => (
          <SelectField
            id="ski-model"
            label={t('model')}
            placeholder={t('selectModel')}
            options={(models.data ?? []).map((model) => ({
              value: model.id,
              label: `${model.brand.name} ${model.name}`,
            }))}
            value={field.value}
            onChange={field.onChange}
            disabled={models.isPending}
            error={errors.modelId && t('errors.model')}
          />
        )}
      />
      <Controller
        control={form.control}
        name="storeId"
        render={({ field }) => (
          <SelectField
            id="ski-store"
            label={t('store')}
            placeholder={t('selectStore')}
            options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
            value={field.value}
            onChange={field.onChange}
            disabled={stores.isPending || ownStore !== undefined}
            hint={ownStore ? t('ownStoreOnly') : undefined}
            error={errors.storeId && t('errors.store')}
          />
        )}
      />
      <Field
        id="ski-length"
        label={t('lengthCm')}
        type="number"
        inputMode="numeric"
        min={MIN_LENGTH_CM}
        max={MAX_LENGTH_CM}
        hint={t('lengthHint')}
        error={errors.lengthCm && t('errors.length', { min: MIN_LENGTH_CM, max: MAX_LENGTH_CM })}
        {...form.register('lengthCm', { valueAsNumber: true })}
      />

      <FormError message={create.error?.message} />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={create.isPending} data-testid="submit-ski">
          {create.isPending ? t('saving') : t('add')}
        </Button>
      </DialogFooter>
    </form>
  );
}
