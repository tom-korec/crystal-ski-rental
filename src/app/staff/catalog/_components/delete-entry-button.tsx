'use client';

import { Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmDialog } from '~/components/common/confirm-dialog';
import { Button } from '~/components/ui/button';

interface DeleteEntryButtonProps {
  name: string;
  onDelete: (done: () => void) => void;
  isPending: boolean;
  error?: string;
  onReset: () => void;
}

/** Deleting a catalogue entry; the server refuses one that is still in use and says why (FR-13). */
export function DeleteEntryButton({ name, onDelete, isPending, error, onReset }: DeleteEntryButtonProps) {
  const t = useTranslations('catalogAdmin');
  const [open, setOpen] = useState(false);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onReset();
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t('deleteNamed', { name })} data-testid="delete-entry" />
      }
      triggerLabel={<Trash2Icon aria-hidden />}
      title={t('deleteTitle', { name })}
      description={t('deleteDescription')}
      confirmLabel={t('delete')}
      pendingLabel={t('deleting')}
      cancelLabel={t('cancel')}
      onConfirm={() => onDelete(() => setOpen(false))}
      isPending={isPending}
      error={error}
      destructive
    />
  );
}
