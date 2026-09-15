'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';

import { SearchFilter } from '~/components/common/filters/search-filter';
import { SelectFilter } from '~/components/common/filters/select-filter';
import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { RoleBadge } from '~/components/layout/role-badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { DATE_FORMAT } from '~/lib/format';
import { pageCount } from '~/lib/pagination';
import { roleSchema } from '~/lib/roles';
import { staffAccountRoute } from '~/lib/routes';
import { type UserListInput, userListSchema } from '~/lib/user-schema';
import { api } from '~/trpc/react';

import { AccountDialog } from './account-dialog';

type AccountFilters = UserListInput;

function parse(params: URLSearchParams): AccountFilters {
  const candidate = {
    search: params.get('q') ?? undefined,
    role: params.get('role') ?? undefined,
    onlyDeleted: params.get('removed') === '1' ? true : undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
  };
  const parsed = userListSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  const invalid = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  return userListSchema.parse(Object.fromEntries(Object.entries(candidate).filter(([key]) => !invalid.has(key))));
}

function serialise(filters: AccountFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.onlyDeleted) params.set('removed', '1');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

interface AccountListProps {
  actorRole?: string | null;
}

/** Accounts in use, or the removed ones a restore starts from (FR-61, FR-63). */
export function AccountList({ actorRole }: AccountListProps) {
  const t = useTranslations('accounts');
  const tRoles = useTranslations('roles');
  const format = useFormatter();
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const accounts = api.user.list.useQuery(filters);

  // Any filter change starts again from the first page.
  const set = (patch: Partial<AccountFilters>) => apply({ ...filters, ...patch, page: 1 });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 shadow-sm ring-1">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <SearchFilter
            id="filter-accounts"
            label={t('search')}
            placeholder={t('searchPlaceholder')}
            value={filters.search}
            onChange={(search) => set({ search })}
          />
          <SelectFilter
            id="filter-role"
            label={t('role')}
            anyLabel={t('anyRole')}
            options={roleSchema.options.map((role) => ({ value: role, label: tRoles(role) }))}
            value={filters.role}
            onChange={(role) => set({ role: role as AccountFilters['role'] })}
          />
          <Button
            variant={filters.onlyDeleted ? 'secondary' : 'outline'}
            aria-pressed={filters.onlyDeleted === true}
            onClick={() => set({ onlyDeleted: filters.onlyDeleted ? undefined : true })}
            data-testid="toggle-removed"
          >
            {t('showRemoved')}
          </Button>
        </div>
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="account-count">
            {accounts.data ? t(filters.onlyDeleted ? 'removedCount' : 'count', { count: accounts.data.total }) : null}
          </p>
          <AccountDialog actorRole={actorRole} />
        </div>
      </div>

      <QueryState
        query={accounts}
        skeleton={<Skeleton className="h-64 w-full" />}
        isEmpty={(data) => data.total === 0}
        empty={<p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">{t('empty')}</p>}
      >
        {(data) => (
          <>
            <div className="bg-card ring-foreground/10 overflow-x-auto rounded-xl ring-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t('name')}</TableHead>
                    <TableHead scope="col">{t('email')}</TableHead>
                    <TableHead scope="col">{t('role')}</TableHead>
                    <TableHead scope="col">{t('joined')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((account) => (
                    <TableRow key={account.id} data-testid="account-row">
                      <TableCell className="font-medium">
                        <Link
                          href={staffAccountRoute(account.id)}
                          className="hover:text-primary underline-offset-4 hover:underline"
                        >
                          {account.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{account.email}</TableCell>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={account.role} />
                          {account.store ? (
                            <span className="text-muted-foreground text-xs" data-testid="account-store">
                              {account.store.name}
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format.dateTime(account.createdAt, DATE_FORMAT)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={data.page}
              pageCount={pageCount(data.total)}
              onPageChange={(page) => apply({ ...filters, page })}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
