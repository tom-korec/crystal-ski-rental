'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Resolver, useForm, useWatch } from 'react-hook-form';

import { AddressFields } from '~/components/addresses/address-fields';
import { FormError } from '~/components/common/form-error';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { PageHeader } from '~/components/common/page-header';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import { Textarea } from '~/components/ui/textarea';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { DEFAULT_COUNTRY, formatPostalCode } from '~/lib/address-schema';
import { rentalPeriod, toUtcDate } from '~/lib/date';
import { removeFromCart, type ReservationCart } from '~/lib/reservation-cart';
import {
  RESERVATION_NOTE_MAX_LENGTH,
  type ReservationDetails,
  reservationDetailsSchema,
} from '~/lib/reservation-schema';
import { APP_HOME, SEARCH_PARAMS } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';

import type { BookedReservation } from './reservation-checkout';

type SavedAddress = RouterOutputs['address']['mine']['mailing'];
/**
 * Both addresses are always in the form, so switching invoices to the mailing address and back keeps what
 * was typed. The schema ignores the invoice address while invoices go to the mailing address.
 */
interface CheckoutValues {
  invoiceToMailingAddress: boolean;
  mailing: ReturnType<typeof addressDefaults>;
  invoice: ReturnType<typeof addressDefaults> & { recipient: string; companyId: string; vatId: string };
  note: string;
}

// The schema's input is the union of its two branches; the form's values are their superset.
const resolver = zodResolver(reservationDetailsSchema) as unknown as Resolver<
  CheckoutValues,
  unknown,
  ReservationDetails
>;

interface CheckoutFormProps {
  cart: ReservationCart;
  onCartChange: (cart: ReservationCart | null) => void;
  onBooked: (reservation: BookedReservation) => void;
}

/** Loads what the form starts from: the priced skis, and the addresses saved in the profile. */
export function CheckoutForm(props: CheckoutFormProps) {
  const addresses = api.address.mine.useQuery();
  const session = api.auth.session.useQuery();

  if (!addresses.data || !session.data) {
    return (
      <LoadingRegion>
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }

  return (
    <CheckoutFields
      {...props}
      defaults={detailsDefaults(addresses.data.mailing, addresses.data.invoice, session.data.name)}
    />
  );
}

function addressDefaults(saved: SavedAddress) {
  return {
    street: saved?.street ?? '',
    houseNumber: saved?.houseNumber ?? '',
    city: saved?.city ?? '',
    zipCode: saved ? formatPostalCode(saved.zipCode, saved.country) : '',
    country: saved?.country ?? DEFAULT_COUNTRY,
  };
}

function detailsDefaults(mailing: SavedAddress, invoice: SavedAddress, name: string): CheckoutValues {
  return {
    // A saved invoice address is what the customer normally uses, so the form starts with it.
    invoiceToMailingAddress: invoice === null,
    mailing: addressDefaults(mailing),
    invoice: {
      ...addressDefaults(invoice),
      recipient: invoice?.recipient ?? name,
      companyId: invoice?.companyId ?? '',
      vatId: invoice?.vatId ?? '',
    },
    note: '',
  };
}

interface CheckoutFieldsProps extends CheckoutFormProps {
  defaults: CheckoutValues;
}

function CheckoutFields({ cart, onCartChange, onBooked, defaults }: CheckoutFieldsProps) {
  const t = useTranslations('checkout');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const utils = api.useUtils();

  const range = { startDate: cart.startDate, endDate: cart.endDate };
  const quote = api.reservation.quote.useQuery({ skiIds: cart.skiIds, ...range });
  const form = useForm<CheckoutValues, unknown, ReservationDetails>({ resolver, defaultValues: defaults });
  const invoiceToMailingAddress = useWatch({ control: form.control, name: 'invoiceToMailingAddress' });
  const mailingCountry = useWatch({ control: form.control, name: 'mailing.country' });
  const invoiceCountry = useWatch({ control: form.control, name: 'invoice.country' });

  const start = toUtcDate(cart.startDate);
  const period = formatDateRange(start, rentalPeriod({ startDate: start, endDate: toUtcDate(cart.endDate) }).lastDay);

  const create = api.reservation.create.useMutation({
    onSuccess: async (reservation) => {
      onBooked({ store: reservation.store.name, period, count: reservation.items.length });
      await Promise.all([
        utils.ski.search.invalidate(),
        utils.reservation.listMine.invalidate(),
        utils.address.mine.invalidate(),
      ]);
    },
  });

  const { errors } = form.formState;
  const lines = quote.data?.lines ?? [];
  const blocked = lines.some((line) => line.problem !== null) || (quote.data?.missing ?? 0) > 0;
  const searchAgain = `${APP_HOME}?${new URLSearchParams({
    [SEARCH_PARAMS.store]: cart.storeId,
    [SEARCH_PARAMS.from]: cart.startDate,
    [SEARCH_PARAMS.to]: cart.endDate,
  }).toString()}`;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((details) => create.mutate({ skiIds: cart.skiIds, ...range, details }))}
    >
      <PageHeader
        title={t('title')}
        description={quote.data?.store ? t('description', { store: quote.data.store.name, period }) : period}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={searchAgain} />} data-testid="add-more">
            {t('addMore')}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card data-testid="checkout-skis">
            <CardHeader>
              <CardTitle>
                <h2>{t('skisTitle', { count: cart.skiIds.length })}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : quote.isError ? (
                <FormError message={quote.error.message} />
              ) : (
                <ul className="divide-border flex flex-col divide-y">
                  {(quote.data.missing > 0 ? [null] : []).map(() => (
                    <li key="missing" className="text-destructive flex items-center gap-2 py-3 text-sm">
                      <AlertTriangleIcon className="size-4" aria-hidden />
                      {t('missing', { count: quote.data.missing })}
                    </li>
                  ))}
                  {lines.map(({ ski, quote: line, problem }) => (
                    <li
                      key={ski.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
                      data-testid="checkout-line"
                      data-problem={problem ?? undefined}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {ski.model.brand.name} {ski.model.name}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {t('length', { length: ski.lengthCm })} ·{' '}
                          {t('perDay', { price: formatMoney(ski.model.pricePerDay) })}
                        </span>
                        {problem ? (
                          <span className="text-destructive flex items-center gap-1.5 text-sm">
                            <AlertTriangleIcon className="size-4" aria-hidden />
                            {t(`problem.${problem}`)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-3">
                        {line ? <span className="tabular-nums">{formatMoney(line.totalPrice)}</span> : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('remove', { skis: `${ski.model.brand.name} ${ski.model.name}` })}
                          onClick={() => onCartChange(removeFromCart(cart, ski.id))}
                          data-testid="remove-line"
                        >
                          <XIcon aria-hidden />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card data-testid="checkout-addresses">
            <CardHeader>
              <CardTitle>
                <h2>{t('addressesTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('addressesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-2">
              <section className="flex flex-col gap-4">
                <h3 className="font-medium">{t('mailing')}</h3>
                <AddressFields
                  idPrefix="checkout-mailing"
                  kind="MAILING"
                  register={(field) => form.register(`mailing.${field}`)}
                  errors={errors.mailing ?? {}}
                  country={mailingCountry}
                  onCountryChange={(country) => form.setValue('mailing.country', country, { shouldDirty: true })}
                />
              </section>
              <section className="flex flex-col gap-4">
                <h3 className="font-medium">{t('invoice')}</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    {...form.register('invoiceToMailingAddress')}
                    data-testid="invoice-to-mailing"
                  />
                  {t('invoiceToMailing')}
                </label>
                {invoiceToMailingAddress ? (
                  <p className="text-muted-foreground text-sm">{t('invoiceToMailingHint')}</p>
                ) : (
                  <AddressFields
                    idPrefix="checkout-invoice"
                    kind="INVOICE"
                    register={(field) => form.register(`invoice.${field}`)}
                    errors={errors.invoice ?? {}}
                    country={invoiceCountry}
                    onCountryChange={(country) => form.setValue('invoice.country', country, { shouldDirty: true })}
                  />
                )}
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t('noteTitle')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="checkout-note">{t('noteLabel')}</Label>
              <Textarea
                id="checkout-note"
                rows={3}
                maxLength={RESERVATION_NOTE_MAX_LENGTH}
                placeholder={t('notePlaceholder')}
                {...form.register('note')}
              />
            </CardContent>
          </Card>

          {quote.data?.store ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>{t('pickupAt')}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StoreDetails store={quote.data.store} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="lg:sticky lg:top-24" data-testid="checkout-summary">
          <CardHeader>
            <CardTitle>
              <h2>{t('summaryTitle')}</h2>
            </CardTitle>
            <CardDescription>{period}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {quote.data?.totals ? (
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
                <dt className="text-muted-foreground">
                  {t('pairsForDays', {
                    count: lines.filter((line) => line.quote).length,
                    days: quote.data.totals.rentalDays,
                  })}
                </dt>
                <dd className="text-right">{formatMoney(quote.data.totals.subtotal)}</dd>
                {quote.data.totals.discountPercent > 0 ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t('discount', { percent: quote.data.totals.discountPercent })}
                    </dt>
                    <dd className="text-right">−{formatMoney(quote.data.totals.discount)}</dd>
                  </>
                ) : null}
                <dt className="border-border border-t pt-1.5 font-medium">{t('total')}</dt>
                <dd
                  className="border-border border-t pt-1.5 text-right text-base font-semibold"
                  data-testid="checkout-total"
                >
                  {formatMoney(quote.data.totals.totalPrice)}
                </dd>
              </dl>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
            {blocked ? <p className="text-destructive">{t('blocked')}</p> : null}
            <FormError message={create.error?.message} data-testid="checkout-error" />
            <Button
              type="submit"
              size="lg"
              disabled={create.isPending || blocked || !quote.data}
              data-testid="confirm-reservation"
            >
              {create.isPending
                ? t('booking')
                : t('confirm', { total: quote.data?.totals ? formatMoney(quote.data.totals.totalPrice) : '' })}
            </Button>
            <p className="text-muted-foreground text-xs">{t('payAtStore')}</p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
