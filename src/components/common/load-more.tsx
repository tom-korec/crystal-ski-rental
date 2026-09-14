'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Button } from '~/components/ui/button';

interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  shown: number;
  total: number;
}

/**
 * The foot of a growing grid: a real button, which also presses itself as it scrolls into view. A
 * keyboard or screen reader user who never scrolls can still reach the rest.
 */
export function LoadMore({ hasMore, isLoading, onLoadMore, shown, total }: LoadMoreProps) {
  const t = useTranslations('common');
  const sentinel = useRef<HTMLDivElement>(null);
  const latest = useRef({ onLoadMore, isLoading });

  useEffect(() => {
    latest.current = { onLoadMore, isLoading };
  });

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !latest.current.isLoading) latest.current.onLoadMore();
      },
      { rootMargin: '300px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore) return null;

  return (
    <div ref={sentinel} className="flex flex-col items-center gap-2 pt-2">
      <Button variant="outline" aria-busy={isLoading} onClick={onLoadMore} data-testid="load-more">
        {isLoading ? t('loadingMore') : t('loadMore')}
      </Button>
      <p className="text-muted-foreground text-sm">{t('shownOfTotal', { shown, total })}</p>
    </div>
  );
}
