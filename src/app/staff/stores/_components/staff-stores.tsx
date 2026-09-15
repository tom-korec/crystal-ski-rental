'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { DeleteEntryButton } from '~/components/common/delete-entry-button';
import { type DirectoryStore, StoreDirectory } from '~/components/stores/store-directory';
import { staffFleetRoute, staffStoreRoute } from '~/lib/routes';
import { api } from '~/trpc/react';

import { SpecialDays } from './special-days';
import { StoreDialog } from './store-dialog';

interface StaffStoresProps {
  /** Admins keep the stores (FR-12); managers only look them up. */
  canEdit: boolean;
}

/** The stores as customers see them, plus adding, editing and deleting them for admins. */
export function StaffStores({ canEdit }: StaffStoresProps) {
  const t = useTranslations('storesAdmin');
  const router = useRouter();
  // A store just added opens on its own tab.
  const open = (store: { id: string }) => router.replace(staffStoreRoute(store.id));

  return (
    <StoreDirectory
      title={t('title')}
      description={canEdit ? t('descriptionAdmin') : t('description')}
      tabsLabel={t('stores')}
      headerActions={canEdit ? <StoreDialog onSaved={open} /> : undefined}
      below={(store) => <SpecialDays store={store} canEdit={canEdit} />}
      actions={(store) => (
        <>
          {store.skiCount > 0 ? (
            <Link
              href={staffFleetRoute({ storeId: store.id })}
              className="text-muted-foreground hover:text-primary me-auto text-sm underline-offset-4 hover:underline"
              data-testid="store-ski-count"
            >
              {t('skiCount', { count: store.skiCount })}
            </Link>
          ) : (
            <span className="text-muted-foreground me-auto text-sm" data-testid="store-ski-count">
              {t('skiCount', { count: store.skiCount })}
            </span>
          )}
          {canEdit ? (
            <>
              <StoreDialog store={store} />
              <DeleteStoreButton store={store} />
            </>
          ) : null}
        </>
      )}
    />
  );
}

interface DeleteStoreButtonProps {
  store: DirectoryStore;
}

function DeleteStoreButton({ store }: DeleteStoreButtonProps) {
  const utils = api.useUtils();
  const remove = api.store.delete.useMutation();

  return (
    <DeleteEntryButton
      name={store.name}
      labelled
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
  );
}
