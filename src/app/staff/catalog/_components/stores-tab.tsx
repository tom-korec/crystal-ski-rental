'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { QueryState } from '~/components/common/query-state';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { formatPhone, formatZipCode } from '~/lib/format';
import {
  OPENING_HOURS_FIELDS,
  OPENING_HOURS_MAX_LENGTH,
  type OpeningHoursField,
  storeCreateSchema,
} from '~/lib/store-schema';
import { api, type RouterOutputs } from '~/trpc/react';

import { DeleteEntryButton } from './delete-entry-button';

type Store = RouterOutputs['store']['list'][number];
type StoreInput = z.input<typeof storeCreateSchema>;
type StoreOutput = z.output<typeof storeCreateSchema>;

const WEEKDAY: Record<
  OpeningHoursField,
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
> = {
  openingHoursMonday: 'monday',
  openingHoursTuesday: 'tuesday',
  openingHoursWednesday: 'wednesday',
  openingHoursThursday: 'thursday',
  openingHoursFriday: 'friday',
  openingHoursSaturday: 'saturday',
  openingHoursSunday: 'sunday',
};

export function StoresTab() {
  const t = useTranslations('catalogAdmin');
  const stores = api.store.list.useQuery();

  return (
    <div className="flex flex-col gap-4">
      <QueryState query={stores} skeleton={<Skeleton className="h-48 w-full" />}>
        {(rows) => (
          <div className="bg-card ring-foreground/10 overflow-x-auto rounded-xl ring-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('name')}</TableHead>
                  <TableHead scope="col">{t('address')}</TableHead>
                  <TableHead scope="col">{t('contact')}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t('skis')}
                  </TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">{t('actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((store) => (
                  <StoreRow key={store.id} store={store} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function StoreRow({ store }: { store: Store }) {
  const utils = api.useUtils();
  const remove = api.store.delete.useMutation();

  return (
    <TableRow data-testid="store-row">
      <TableCell className="font-medium">{store.name}</TableCell>
      <TableCell className="whitespace-nowrap">
        {store.street} {store.houseNumber}, {formatZipCode(store.zipCode)} {store.city}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {formatPhone(store.phone)} · {store.email}
      </TableCell>
      <TableCell className="text-right tabular-nums">{store.skiCount}</TableCell>
      <TableCell>
        <span className="flex justify-end gap-1">
          <StoreDialog store={store} />
          <DeleteEntryButton
            name={store.name}
            isPending={remove.isPending}
            error={remove.error?.message}
            onReset={() => remove.reset()}
            onDelete={(done) =>
              remove.mutate(
                { id: store.id },
                {
                  onSuccess: () => {
                    void utils.store.list.invalidate();
                    done();
                  },
                },
              )
            }
          />
        </span>
      </TableCell>
    </TableRow>
  );
}

export function StoreDialog({ store }: { store?: Store }) {
  const t = useTranslations('catalogAdmin');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {store ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('editNamed', { name: store.name })}
              data-testid="edit-entry"
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button data-testid="add-store" />}>
          <PlusIcon aria-hidden />
          {t('addStore')}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="store-dialog">
        {open ? <StoreForm store={store} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function StoreForm({ store, onDone }: { store?: Store; onDone: () => void }) {
  const t = useTranslations('catalogAdmin');
  const tStores = useTranslations('stores');
  const utils = api.useUtils();

  const form = useForm<StoreInput, unknown, StoreOutput>({
    resolver: zodResolver(storeCreateSchema),
    defaultValues: store
      ? { ...store, zipCode: formatZipCode(store.zipCode), phone: formatPhone(store.phone) }
      : {
          name: '',
          street: '',
          houseNumber: '',
          city: '',
          zipCode: '',
          phone: '',
          email: '',
          ...Object.fromEntries(OPENING_HOURS_FIELDS.map((field) => [field, ''])),
        },
  });
  const { errors } = form.formState;

  const onSuccess = async () => {
    await utils.store.invalidate();
    onDone();
  };
  const create = api.store.create.useMutation({ onSuccess });
  const update = api.store.update.useMutation({ onSuccess });
  const mutation = store ? update : create;

  function copyMondayToAll() {
    const monday = form.getValues('openingHoursMonday');
    for (const field of OPENING_HOURS_FIELDS) form.setValue(field, monday, { shouldDirty: true });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) =>
        store ? update.mutate({ id: store.id, ...values }) : create.mutate(values),
      )}
    >
      <DialogHeader>
        <DialogTitle>{store ? t('editStore') : t('addStore')}</DialogTitle>
      </DialogHeader>

      <Field id="store-name" label={t('name')} error={errors.name && t('errors.required')} {...form.register('name')} />

      <fieldset className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <legend className="mb-3 text-sm font-medium">{t('address')}</legend>
        <Field
          id="store-street"
          label={t('street')}
          autoComplete="off"
          error={errors.street && t('errors.required')}
          {...form.register('street')}
        />
        <Field
          id="store-house-number"
          label={t('houseNumber')}
          autoComplete="off"
          error={errors.houseNumber && t('errors.required')}
          {...form.register('houseNumber')}
        />
        <Field
          id="store-city"
          label={t('city')}
          autoComplete="off"
          error={errors.city && t('errors.required')}
          {...form.register('city')}
        />
        <Field
          id="store-zip"
          label={t('zipCode')}
          placeholder="031 01"
          autoComplete="off"
          error={errors.zipCode?.message && t('errors.zip')}
          {...form.register('zipCode')}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="store-phone"
          label={t('phone')}
          type="tel"
          placeholder="+421 903 123 456"
          error={errors.phone && t('errors.phone')}
          {...form.register('phone')}
        />
        <Field
          id="store-email"
          label={t('email')}
          type="email"
          error={errors.email && t('errors.email')}
          {...form.register('email')}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-medium">{tStores('openingHours')}</legend>
          <Button type="button" variant="ghost" size="sm" onClick={copyMondayToAll} data-testid="copy-monday">
            {t('copyMonday')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t('hoursHint')}</p>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {OPENING_HOURS_FIELDS.map((field) => (
            <Field
              key={field}
              id={`store-${field}`}
              label={tStores(`weekdays.${WEEKDAY[field]}`)}
              placeholder={t('hoursPlaceholder')}
              maxLength={OPENING_HOURS_MAX_LENGTH}
              autoComplete="off"
              error={errors[field] && t('errors.hours', { max: OPENING_HOURS_MAX_LENGTH })}
              {...form.register(field)}
            />
          ))}
        </div>
      </fieldset>

      <FormError message={mutation.error?.message} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={mutation.isPending} data-testid="save-entry">
          {mutation.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
