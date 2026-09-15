'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Resolver, useForm, useWatch } from 'react-hook-form';

import { AddressFields } from '~/components/addresses/address-fields';
import { FormError } from '~/components/common/form-error';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { PageHeader } from '~/components/common/page-header';
import { LegalCheckbox } from '~/components/legal/legal-checkbox';
import { CartLines } from '~/components/reservations/cart-lines';
import { CartTotals } from '~/components/reservations/cart-totals';
import { RentalDayNotice } from '~/components/stores/rental-day-notice';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import { Textarea } from '~/components/ui/textarea';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { DEFAULT_COUNTRY, formatPostalCode } from '~/lib/address-schema';
import { LEGAL_VERSIONS } from '~/lib/legal';
import { rentalPeriod, toUtcDate, utcDaysBetween } from '~/lib/date';
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
  const tLegal = useTranslations('legal');
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
  const rentalDays = utcDaysBetween(start, toUtcDate(cart.endDate));
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
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementSubmitted, setAgreementSubmitted] = useState(false);
  const lines = quote.data?.lines ?? [];
  const closed = (quote.data?.closedDays.length ?? 0) > 0;
  const blocked = closed || lines.some((line) => line.problem !== null) || (quote.data?.missing ?? 0) > 0;
  const searchAgain = `${APP_HOME}?${new URLSearchParams({
    [SEARCH_PARAMS.store]: cart.storeId,
    [SEARCH_PARAMS.from]: cart.startDate,
    [SEARCH_PARAMS.to]: cart.endDate,
  }).toString()}`;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        // Both the details and the agreement are checked at once, so every missing answer shows together.
        setAgreementSubmitted(true);
        void form.handleSubmit((details) => {
          if (!agreementAccepted) return;
          create.mutate({
            skiIds: cart.skiIds,
            ...range,
            details,
            rentalAgreementVersion: LEGAL_VERSIONS.rentalAgreement,
          });
        })(event);
      }}
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
                <CartLines
                  quote={quote.data}
                  rentalDays={rentalDays}
                  onRemove={(skiId) => onCartChange(removeFromCart(cart, skiId))}
                />
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
            <CartTotals quote={quote.data} />
            {quote.data?.store && quote.data.days ? (
              <RentalDayNotice days={quote.data.days} store={quote.data.store.name} />
            ) : null}
            {blocked && !closed ? <p className="text-destructive">{t('blocked')}</p> : null}
            <FormError message={create.error?.message} data-testid="checkout-error" />
            <LegalCheckbox
              id="accept-rental-agreement"
              message="bookingAgree"
              checked={agreementAccepted}
              onChange={(event) => setAgreementAccepted(event.target.checked)}
              error={agreementSubmitted && !agreementAccepted ? tLegal('bookingRequired') : undefined}
            />
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
