'use client';

import { MailIcon, StarIcon } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { DATE_FORMAT } from '~/lib/format';
import { pageCount } from '~/lib/pagination';
import { staffAccountRoute } from '~/lib/routes';
import { api } from '~/trpc/react';

interface ModelRatingsDialogProps {
  modelId: string;
  name: string;
  ratingCount: number;
  children: ReactNode;
}

/** Every rating of a model with its comment and author, so staff can reply by e-mail (FR-14, BR-42). */
export function ModelRatingsDialog({ modelId, name, ratingCount, children }: ModelRatingsDialogProps) {
  const t = useTranslations('catalogAdmin');
  const [open, setOpen] = useState(false);

  if (ratingCount === 0) return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="focus-visible:ring-ring/50 rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3"
            data-testid="open-ratings"
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" data-testid="ratings-dialog">
        <DialogHeader>
          <DialogTitle>{t('ratingsTitle', { name })}</DialogTitle>
          <DialogDescription>{t('ratingsDescription')}</DialogDescription>
        </DialogHeader>
        {open ? <RatingsList modelId={modelId} name={name} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RatingsList({ modelId, name }: { modelId: string; name: string }) {
  const t = useTranslations('catalogAdmin');
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const ratings = api.rating.byModel.useQuery({ modelId, page });

  return (
    <QueryState query={ratings} skeleton={<Skeleton className="h-64 w-full" />}>
      {(data) => (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          <ul className="divide-border divide-y">
            {data.items.map((rating) => (
              <li key={rating.id} className="flex flex-col gap-1 py-3 text-sm" data-testid="model-rating">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <StarIcon className="fill-highlight text-highlight size-4" aria-hidden />
                    {t('scoreOutOf', { score: rating.score })} ·{' '}
                    <Link
                      href={staffAccountRoute(rating.user.id)}
                      className="hover:text-primary underline-offset-4 hover:underline"
                    >
                      {rating.user.name}
                    </Link>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format.dateTime(rating.updatedAt, DATE_FORMAT)}
                  </span>
                </div>
                {rating.comment ? <p className="text-pretty">“{rating.comment}”</p> : null}
                <a
                  href={`mailto:${rating.user.email}?subject=${encodeURIComponent(t('replySubject', { name }))}`}
                  className="text-primary inline-flex w-fit items-center gap-1.5 text-xs underline-offset-4 hover:underline"
                  data-testid="reply-by-email"
                >
                  <MailIcon className="size-3.5" aria-hidden />
                  {t('replyByEmail', { email: rating.user.email })}
                </a>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageCount={pageCount(data.total)} onPageChange={setPage} />
        </div>
      )}
    </QueryState>
  );
}
