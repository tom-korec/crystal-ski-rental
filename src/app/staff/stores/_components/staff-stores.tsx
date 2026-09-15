'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { DeleteEntryButton } from '~/components/common/delete-entry-button';
import { type DirectoryStore, StoreDirectory } from '~/components/stores/store-directory';
import { SEARCH_PARAMS, STAFF_STORES } from '~/lib/routes';
import { api } from '~/trpc/react';

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
  const open = (store: { id: string }) => router.replace(`${STAFF_STORES}?${SEARCH_PARAMS.store}=${store.id}`);

  return (
    <StoreDirectory
      title={t('title')}
      description={canEdit ? t('descriptionAdmin') : t('description')}
      tabsLabel={t('stores')}
      headerActions={canEdit ? <StoreDialog onSaved={open} /> : undefined}
      actions={(store) => (
        <>
          <span className="text-muted-foreground me-auto text-sm" data-testid="store-ski-count">
            {t('skiCount', { count: store.skiCount })}
          </span>
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
