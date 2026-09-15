'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { FormError } from '~/components/common/form-error';
import { PageHeader } from '~/components/common/page-header';
import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { RoleBadge } from '~/components/layout/role-badge';
import { StaffReservationRow } from '~/components/reservations/staff-reservation-row';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { mayManageAccount } from '~/lib/account-rules';
import { DATE_FORMAT } from '~/lib/format';
import { pageCount } from '~/lib/pagination';
import { STAFF_ACCOUNTS } from '~/lib/routes';
import { api } from '~/trpc/react';

import { AccountDialog } from '../../_components/account-dialog';

interface AccountDetailProps {
  id: string;
  actor: { id: string; role?: string | null };
}

/** One account with its reservation history, and what the viewer may do with it (FR-60…63). */
export function AccountDetail({ id, actor }: AccountDetailProps) {
  const t = useTranslations('accounts');
  const format = useFormatter();
  const router = useRouter();
  const utils = api.useUtils();
  const [confirming, setConfirming] = useState(false);

  const account = api.user.byId.useQuery({ id });
  const refresh = () => Promise.all([utils.user.byId.invalidate({ id }), utils.user.list.invalidate()]);
  const remove = api.user.delete.useMutation({
    onSuccess: async () => {
      await refresh();
      router.replace(STAFF_ACCOUNTS);
    },
  });
  const restore = api.user.restore.useMutation({ onSuccess: refresh });

  if (account.isPending) {
    return (
      <LoadingRegion>
        <Skeleton className="h-32 w-full" />
      </LoadingRegion>
    );
  }
  if (account.isError) return <FormError message={account.error.message} />;

  const user = account.data;
  const removed = user.deletedAt !== null;
  const canManage = mayManageAccount(actor.role, user.role) && user.id !== actor.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <>
            <RoleBadge role={user.role} />
            {user.store ? (
              <Badge variant="outline" data-testid="account-store">
                {user.store.name}
              </Badge>
            ) : null}
            {removed ? <Badge variant="destructive">{t('removed')}</Badge> : null}
          </>
        }
        title={user.name}
        description={
          <>
            <a href={`mailto:${user.email}`} className="hover:text-primary underline-offset-4 hover:underline">
              {user.email}
            </a>{' '}
            · {t('joinedOn', { date: format.dateTime(user.createdAt, DATE_FORMAT) })}
            {user.role === 'USER' ? (
              <span className="block" data-testid="account-legal">
                {user.termsAcceptedAt && user.termsAcceptedVersion
                  ? t('termsAccepted', {
                      version: user.termsAcceptedVersion,
                      date: format.dateTime(user.termsAcceptedAt, DATE_FORMAT),
                    })
                  : t('termsPending')}
              </span>
            ) : null}
          </>
        }
        actions={
          canManage ? (
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-2">
                {removed ? (
                  <Button
                    onClick={() => restore.mutate({ id })}
                    disabled={restore.isPending}
                    data-testid="restore-account"
                  >
                    {restore.isPending ? t('saving') : t('restore')}
                  </Button>
                ) : (
                  <>
                    <AccountDialog actorRole={actor.role} account={user} />
                    <ConfirmDialog
                      open={confirming}
                      onOpenChange={(open) => {
                        setConfirming(open);
                        if (!open) remove.reset();
                      }}
                      trigger={<Button variant="destructive" data-testid="remove-account" />}
                      triggerLabel={t('remove')}
                      title={t('removeTitle', { name: user.name })}
                      description={t('removeDescription')}
                      confirmLabel={t('remove')}
                      pendingLabel={t('saving')}
                      cancelLabel={t('cancel')}
                      onConfirm={() => remove.mutate({ id })}
                      isPending={remove.isPending}
                      error={remove.error?.message}
                      destructive
                    />
                  </>
                )}
              </div>
              <FormError message={restore.error?.message} />
            </div>
          ) : null
        }
      />

      {user.role === 'USER' ? <AccountReservations userId={id} /> : null}
    </div>
  );
}

function AccountReservations({ userId }: { userId: string }) {
  const t = useTranslations('accounts');
  const [page, setPage] = useState(1);
  const reservations = api.reservation.byUser.useQuery({ userId, page });

  return (
    <Card className="gap-2" data-testid="account-reservations">
      <CardHeader>
        <CardTitle>
          <h2>{t('reservations')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <QueryState
          query={reservations}
          skeleton={<Skeleton className="h-40 w-full" />}
          isEmpty={(data) => data.total === 0}
          empty={<p className="text-muted-foreground py-3 text-sm">{t('noReservations')}</p>}
        >
          {(data) => (
            <>
              <ul className="divide-border divide-y">
                {data.items.map((reservation) => (
                  <StaffReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    show={{ skis: true, status: true, rating: true }}
                  />
                ))}
              </ul>
              <Pagination page={data.page} pageCount={pageCount(data.total)} onPageChange={setPage} />
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
