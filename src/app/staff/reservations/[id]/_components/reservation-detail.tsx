'use client';

import { MailIcon, MessageSquareIcon, StarIcon } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { FormError } from '~/components/common/form-error';
import { PageHeader } from '~/components/common/page-header';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { StaffReservationActions } from '~/components/reservations/staff-reservation-row';
import { StatusBadge } from '~/components/reservations/status-badge';
import { DiscountBadge } from '~/components/skis/discount-badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { formatPostalCode } from '~/lib/address-schema';
import { rentalPeriod } from '~/lib/date';
import { DATE_FORMAT, TIME_FORMAT } from '~/lib/format';
import { Money } from '~/lib/money';
import { staffAccountRoute, staffSkiRoute, staffStoreRoute } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';

type Detail = RouterOutputs['reservation']['byId'];

interface ReservationDetailProps {
  id: string;
}

/** One reservation for staff: skis, prices, customer, addresses, note, rating and its history (FR-66). */
export function ReservationDetail({ id }: ReservationDetailProps) {
  const t = useTranslations('staffReservationDetail');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const reservation = api.reservation.byId.useQuery({ id });

  if (reservation.isPending) {
    return (
      <LoadingRegion>
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }
  if (reservation.isError) return <FormError message={reservation.error.message} />;

  const data = reservation.data;
  const { items, user, store } = data;
  const period = formatDateRange(data.startDate, rentalPeriod(data).lastDay);
  const subtotal = items.reduce(
    (sum, item) => sum.plus(new Money(item.pricePerDay).times(data.rentalDays)),
    new Money(0),
  );

  return (
    <div className="flex flex-col gap-6" data-testid="reservation-detail">
      <PageHeader
        eyebrow={
          <>
            <span
              className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 font-mono text-sm font-medium tracking-wider"
              data-testid="reservation-code"
            >
              {data.code}
            </span>
            <StatusBadge status={data.status} audience="staff" />
          </>
        }
        title={period}
        description={t.rich('summary', {
          store: store.name,
          count: items.length,
          days: data.rentalDays,
          storeLink: (chunks) => (
            <Link
              href={staffStoreRoute(store.id)}
              className="hover:text-primary underline-offset-4 hover:underline"
              data-testid="reservation-store-link"
            >
              {chunks}
            </Link>
          ),
        })}
        actions={<StaffReservationActions reservation={data} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t('skis', { count: items.length })}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <ul className="divide-border flex flex-col divide-y" data-testid="reservation-items">
                {items.map(({ id: itemId, ski, pricePerDay }) => (
                  <li key={itemId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={staffSkiRoute(ski.id)}
                        className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono text-xs hover:underline"
                        data-testid="inventory-code"
                      >
                        {ski.inventoryCode}
                      </Link>
                      <span className="font-medium">
                        {ski.model.brand.name} {ski.model.name}
                      </span>
                      <span className="text-muted-foreground">{t('length', { length: ski.lengthCm })}</span>
                    </span>
                    <span className="flex items-baseline gap-3 tabular-nums">
                      <span className="text-muted-foreground text-xs">
                        {t('perDayTimesDays', { price: formatMoney(pricePerDay), days: data.rentalDays })}
                      </span>
                      <span>{formatMoney(new Money(pricePerDay).times(data.rentalDays).toFixed(2))}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="border-border grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 tabular-nums sm:ms-auto sm:w-80">
                <dt className="text-muted-foreground">{t('beforeDiscount')}</dt>
                <dd className="text-right">{formatMoney(subtotal.toFixed(2))}</dd>
                {data.discountPercent > 0 ? (
                  <>
                    <dt className="text-muted-foreground flex items-center gap-2">
                      {t('discount', { days: data.rentalDays })}
                      <DiscountBadge percent={data.discountPercent} />
                    </dt>
                    <dd className="text-right">−{formatMoney(subtotal.minus(data.totalPrice).toFixed(2))}</dd>
                  </>
                ) : null}
                <dt className="font-medium">{t('total')}</dt>
                <dd className="text-right text-base font-semibold" data-testid="reservation-total">
                  {formatMoney(data.totalPrice)}
                </dd>
              </dl>
            </CardContent>
          </Card>

          {data.note || data.rating ? (
            <Card>
              <CardContent className="flex flex-col gap-3 text-sm">
                {data.note ? (
                  <p className="flex items-start gap-2" data-testid="reservation-note">
                    <MessageSquareIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="text-muted-foreground">{t('note')}: </span>“{data.note}”
                    </span>
                  </p>
                ) : null}
                {data.rating ? (
                  <p className="flex items-start gap-2" data-testid="rental-rating">
                    <StarIcon className="fill-highlight text-highlight mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {t('rating', { score: data.rating.score })}
                      {data.rating.note ? <span className="text-muted-foreground"> · “{data.rating.note}”</span> : null}
                    </span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t('customer')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <Link
                  href={staffAccountRoute(user.id)}
                  className="font-medium underline-offset-4 hover:underline"
                  data-testid="reservation-customer"
                >
                  {user.name}
                </Link>
                <a
                  href={`mailto:${user.email}`}
                  className="text-primary flex items-center gap-1.5 break-all underline-offset-4 hover:underline"
                >
                  <MailIcon className="size-3.5 shrink-0" aria-hidden />
                  {user.email}
                </a>
              </div>
              <Addresses addresses={data.addresses} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t('history')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <History reservation={data} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface AddressesProps {
  addresses: Detail['addresses'];
}

function Addresses({ addresses }: AddressesProps) {
  const t = useTranslations('staffReservationDetail');
  const locale = useLocale();
  const countries = new Intl.DisplayNames([locale], { type: 'region' });
  const mailing = addresses.find((address) => address.kind === 'MAILING');
  const invoice = addresses.find((address) => address.kind === 'INVOICE');

  if (!mailing) return <p className="text-muted-foreground">{t('noAddresses')}</p>;

  const lines = (address: Detail['addresses'][number]) => (
    <address className="not-italic">
      {address.recipient ? <span className="block font-medium">{address.recipient}</span> : null}
      <span className="block">
        {address.street} {address.houseNumber}
      </span>
      <span className="block">
        {formatPostalCode(address.zipCode, address.country)} {address.city}, {countries.of(address.country)}
      </span>
      {address.companyId ? (
        <span className="text-muted-foreground block">{t('companyId', { id: address.companyId })}</span>
      ) : null}
      {address.vatId ? <span className="text-muted-foreground block">{t('vatId', { id: address.vatId })}</span> : null}
    </address>
  );

  return (
    <dl className="border-border flex flex-col gap-3 border-t pt-3" data-testid="reservation-addresses">
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground text-xs">{t('mailingAddress')}</dt>
        <dd>{lines(mailing)}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground text-xs">{t('invoiceAddress')}</dt>
        <dd>{invoice ? lines(invoice) : t('invoiceToMailing')}</dd>
      </div>
    </dl>
  );
}

interface HistoryProps {
  reservation: Detail;
}

/** Who moved the reservation along, and when (BR-13). */
function History({ reservation }: HistoryProps) {
  const t = useTranslations('staffReservationDetail');
  const format = useFormatter();
  const when = (date: Date) => `${format.dateTime(date, DATE_FORMAT)}, ${format.dateTime(date, TIME_FORMAT)}`;

  const steps: { key: string; label: string; at: Date; by?: string }[] = [
    { key: 'booked', label: t('booked'), at: reservation.createdAt, by: reservation.user.name },
  ];
  if (reservation.rentalAgreementAcceptedAt && reservation.rentalAgreementVersion) {
    steps.push({
      key: 'agreement',
      label: t('agreementAccepted', { version: reservation.rentalAgreementVersion }),
      at: reservation.rentalAgreementAcceptedAt,
    });
  }
  if (reservation.pickedUpAt) {
    steps.push({ key: 'pickedUp', label: t('pickedUp'), at: reservation.pickedUpAt, by: reservation.pickedUpBy?.name });
  }
  if (reservation.returnedAt) {
    steps.push({ key: 'returned', label: t('returned'), at: reservation.returnedAt, by: reservation.returnedBy?.name });
  }
  if (reservation.cancelledAt) {
    steps.push({
      key: 'cancelled',
      label: t('cancelled'),
      at: reservation.cancelledAt,
      by: reservation.cancelledBy?.name,
    });
  }

  return (
    <ol className="flex flex-col gap-3 text-sm" data-testid="reservation-history">
      {steps.map((step) => (
        <li key={step.key} className="border-primary/40 flex flex-col border-l-2 ps-3">
          <span className="font-medium">{step.label}</span>
          <span className="text-muted-foreground text-xs">
            {when(step.at)}
            {step.by ? ` · ${step.by}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}
