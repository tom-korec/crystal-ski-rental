'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { FormError } from '~/components/common/form-error';
import { PageHeader } from '~/components/common/page-header';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { RatingSummary } from '~/components/skis/rating-summary';
import { SkiBadges } from '~/components/skis/ski-badges';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useStaffActor } from '~/components/layout/staff-actor';
import { useFormatMoney } from '~/hooks/use-format-money';
import { mayChangeSkisAt } from '~/lib/account-rules';
import { staffFleetRoute, staffStoreRoute } from '~/lib/routes';
import { api } from '~/trpc/react';

import { AvailabilityToggle } from './availability-toggle';
import { DeleteSkiDialog } from './delete-ski-dialog';
import { EditSkiDialog } from './edit-ski-dialog';
import { SkiReservations } from './ski-reservations';

interface SkiDetailProps {
  id: string;
}

/** One ski with its model, store, availability and full reservation history (FR-23). */
export function SkiDetail({ id }: SkiDetailProps) {
  const t = useTranslations('skiDetail');
  const formatMoney = useFormatMoney();
  const actor = useStaffActor();
  const ski = api.ski.byId.useQuery({ id });
  const blockers = api.reservation.blockersBySki.useQuery({ skiId: id });

  if (ski.isPending) {
    return (
      <LoadingRegion>
        <Skeleton className="h-40 w-full" />
      </LoadingRegion>
    );
  }
  if (ski.isError) return <FormError message={ski.error.message} />;

  const { model, store } = ski.data;
  const removed = ski.data.deletedAt !== null;
  const canChange = mayChangeSkisAt(actor, store.id);
  const upcoming = blockers.data?.upcoming ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <>
            <span
              className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 font-mono text-sm"
              data-testid="inventory-code"
            >
              {ski.data.inventoryCode}
            </span>
            {removed ? (
              <Badge variant="destructive">{t('removed')}</Badge>
            ) : ski.data.isAvailable ? (
              <Badge data-testid="availability">{t('available')}</Badge>
            ) : (
              <Badge variant="outline" data-testid="availability">
                {t('outOfRental')}
              </Badge>
            )}
          </>
        }
        title={`${model.brand.name} ${model.name} · ${t('length', { length: ski.data.lengthCm })}`}
        description={
          !removed && !canChange ? (
            <span data-testid="read-only-ski">{t('readOnly', { store: store.name })}</span>
          ) : undefined
        }
        actions={
          removed || !canChange ? null : (
            <>
              <EditSkiDialog ski={ski.data} blockers={blockers.data} />
              <AvailabilityToggle ski={ski.data} upcoming={upcoming} />
              <DeleteSkiDialog ski={ski.data} open={blockers.data?.open} />
            </>
          )
        }
      />

      {!removed && !ski.data.isAvailable && upcoming > 0 ? (
        <p
          className="bg-secondary text-secondary-foreground rounded-lg p-3 text-sm"
          role="status"
          data-testid="out-of-rental-notice"
        >
          {t('outOfRentalNotice', { count: upcoming })}
        </p>
      ) : null}

      <Card>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t('store')}</dt>
              <dd className="font-medium">
                <Link
                  href={staffStoreRoute(store.id)}
                  className="hover:text-primary underline-offset-4 hover:underline"
                  data-testid="ski-store-link"
                >
                  {store.name}, {store.city}
                </Link>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t('pricePerDay')}</dt>
              <dd className="font-medium">{formatMoney(model.pricePerDay)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t('modelRating')}</dt>
              <dd>
                <RatingSummary avgRating={model.avgRating} ratingCount={model.ratingCount} />
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{t('model')}</dt>
              <dd className="flex flex-col items-start gap-1.5">
                <SkiBadges type={model.type} gender={model.gender} skillLevel={model.skillLevel} />
                <Link
                  href={staffFleetRoute({ modelId: model.id })}
                  className="text-primary text-xs underline-offset-4 hover:underline"
                  data-testid="model-fleet-link"
                >
                  {t('allOfModel')}
                </Link>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <SkiReservations skiId={id} />
    </div>
  );
}
