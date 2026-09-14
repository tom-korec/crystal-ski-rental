'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

/** Previous, next and the position between them, announced when it changes. */
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const t = useTranslations('common');

  if (pageCount <= 1) return null;

  return (
    <nav aria-label={t('pagination')} className="flex items-center justify-between gap-3" data-testid="pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        data-testid="page-previous"
      >
        <ChevronLeftIcon aria-hidden />
        {t('previous')}
      </Button>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t('pageOf', { page, pageCount })}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        data-testid="page-next"
      >
        {t('next')}
        <ChevronRightIcon aria-hidden />
      </Button>
    </nav>
  );
}
