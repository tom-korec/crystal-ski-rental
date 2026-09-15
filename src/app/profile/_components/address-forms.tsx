'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { AddressFields } from '~/components/addresses/address-fields';
import { FormError } from '~/components/common/form-error';
import { QueryState } from '~/components/common/query-state';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { DEFAULT_COUNTRY, formatPostalCode, invoiceAddressSchema, mailingAddressSchema } from '~/lib/address-schema';
import { api, type RouterOutputs } from '~/trpc/react';

type SavedAddress = NonNullable<RouterOutputs['address']['mine']['mailing']>;

/** A customer's mailing and invoice addresses, each saved or removed on its own (FR-6). */
export function AddressForms() {
  const t = useTranslations('addresses');
  const addresses = api.address.mine.useQuery();

  return (
    <Card data-testid="address-forms">
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState query={addresses} skeleton={<Skeleton className="h-96 w-full" />}>
          {(data) => (
            <div className="grid gap-10 lg:grid-cols-2">
              <MailingAddressForm saved={data.mailing} />
              <InvoiceAddressForm saved={data.invoice} />
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

type MailingInput = z.input<typeof mailingAddressSchema>;
type MailingOutput = z.output<typeof mailingAddressSchema>;
type InvoiceInput = z.input<typeof invoiceAddressSchema>;
type InvoiceOutput = z.output<typeof invoiceAddressSchema>;

function mailingDefaults(saved: SavedAddress | null) {
  return {
    street: saved?.street ?? '',
    houseNumber: saved?.houseNumber ?? '',
    city: saved?.city ?? '',
    zipCode: saved ? formatPostalCode(saved.zipCode, saved.country) : '',
    country: saved?.country ?? DEFAULT_COUNTRY,
  };
}

interface AddressFormProps {
  saved: SavedAddress | null;
}

function MailingAddressForm({ saved }: AddressFormProps) {
  const form = useForm<MailingInput, unknown, MailingOutput>({
    resolver: zodResolver(mailingAddressSchema),
    defaultValues: mailingDefaults(saved),
  });
  const country = useWatch({ control: form.control, name: 'country' });
  const mutations = useAddressMutations('MAILING', () => form.reset(mailingDefaults(null)));

  return (
    <AddressSection
      kind="MAILING"
      isSaved={saved !== null}
      isDirty={form.formState.isDirty}
      mutations={mutations}
      onSubmit={form.handleSubmit((address) =>
        mutations.save.mutate({ kind: 'MAILING', address }, { onSuccess: (next) => form.reset(mailingDefaults(next)) }),
      )}
    >
      <AddressFields
        idPrefix="mailing"
        kind="MAILING"
        register={(field) => form.register(field)}
        errors={form.formState.errors}
        country={country ?? DEFAULT_COUNTRY}
        onCountryChange={(country) => form.setValue('country', country, { shouldDirty: true })}
      />
    </AddressSection>
  );
}

function invoiceDefaults(saved: SavedAddress | null) {
  return {
    ...mailingDefaults(saved),
    recipient: saved?.recipient ?? '',
    companyId: saved?.companyId ?? '',
    vatId: saved?.vatId ?? '',
  };
}

function InvoiceAddressForm({ saved }: AddressFormProps) {
  const t = useTranslations('addresses');
  const [adding, setAdding] = useState(false);
  const form = useForm<InvoiceInput, unknown, InvoiceOutput>({
    resolver: zodResolver(invoiceAddressSchema),
    defaultValues: invoiceDefaults(saved),
  });
  const country = useWatch({ control: form.control, name: 'country' });
  const mutations = useAddressMutations('INVOICE', () => {
    form.reset(invoiceDefaults(null));
    setAdding(false);
  });

  if (!saved && !adding) {
    return (
      <section className="flex flex-col items-start gap-3" data-testid="INVOICE-address">
        <h3 className="font-medium">{t('INVOICE.title')}</h3>
        <p className="text-muted-foreground text-sm">{t('INVOICE.none')}</p>
        <Button type="button" variant="outline" onClick={() => setAdding(true)} data-testid="add-invoice-address">
          <PlusIcon aria-hidden />
          {t('INVOICE.add')}
        </Button>
      </section>
    );
  }

  return (
    <AddressSection
      kind="INVOICE"
      isSaved={saved !== null}
      isDirty={form.formState.isDirty}
      mutations={mutations}
      onCancel={saved ? undefined : () => setAdding(false)}
      onSubmit={form.handleSubmit((address) =>
        mutations.save.mutate({ kind: 'INVOICE', address }, { onSuccess: (next) => form.reset(invoiceDefaults(next)) }),
      )}
    >
      <AddressFields
        idPrefix="invoice"
        kind="INVOICE"
        register={(field) => form.register(field)}
        errors={form.formState.errors}
        country={country ?? DEFAULT_COUNTRY}
        onCountryChange={(country) => form.setValue('country', country, { shouldDirty: true })}
      />
    </AddressSection>
  );
}

function useAddressMutations(kind: 'MAILING' | 'INVOICE', onRemoved: () => void) {
  const utils = api.useUtils();
  const refresh = () => utils.address.mine.invalidate();

  const save = api.address.save.useMutation({ onSuccess: refresh });
  const remove = api.address.remove.useMutation({
    onSuccess: async () => {
      await refresh();
      onRemoved();
    },
  });

  return { kind, save, remove };
}

interface AddressSectionProps {
  kind: 'MAILING' | 'INVOICE';
  isSaved: boolean;
  isDirty: boolean;
  mutations: ReturnType<typeof useAddressMutations>;
  onSubmit: () => void;
  onCancel?: () => void;
  children: ReactNode;
}

function AddressSection({ kind, isSaved, isDirty, mutations, onSubmit, onCancel, children }: AddressSectionProps) {
  const t = useTranslations('addresses');
  const { save, remove } = mutations;
  const pending = save.isPending || remove.isPending;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      data-testid={`${kind}-address`}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{t(`${kind}.title`)}</h3>
        <p className="text-muted-foreground text-sm">{t(`${kind}.description`)}</p>
      </div>

      {children}

      <FormError message={save.error?.message ?? remove.error?.message} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || !isDirty} data-testid={`save-${kind}-address`}>
          {save.isPending ? t('saving') : t('save')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        ) : null}
        {isSaved ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => remove.mutate({ kind })}
            data-testid={`remove-${kind}-address`}
          >
            {remove.isPending ? t('removing') : t('remove')}
          </Button>
        ) : null}
        {save.isSuccess && !isDirty ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('saved')}
          </p>
        ) : null}
      </div>
    </form>
  );
}
