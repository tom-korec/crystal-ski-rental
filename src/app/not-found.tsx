import { SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageMessage } from '~/components/common/page-message';
import { Button } from '~/components/ui/button';
import { LANDING } from '~/lib/routes';

export default async function NotFound() {
  const t = await getTranslations('errors');
  const tActions = await getTranslations('common.actions');

  return (
    <PageMessage
      icon={<SearchXIcon className="size-8" aria-hidden />}
      title={t('notFoundTitle')}
      description={t('notFoundDescription')}
      actions={
        <Button nativeButton={false} render={<Link href={LANDING} />}>
          {tActions('home')}
        </Button>
      }
    />
  );
}
