'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '~/components/common/page-header';
import { Card } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useUrlFilters } from '~/hooks/use-url-filters';

import { BrandDialog, BrandsTab } from './brands-tab';
import { ModelDialog, ModelsTab } from './models-tab';

const TABS = ['models', 'brands'] as const;
type Tab = (typeof TABS)[number];

const parse = (params: URLSearchParams): { tab: Tab } => ({
  tab: TABS.find((tab) => tab === params.get('tab')) ?? 'models',
});
const serialise = ({ tab }: { tab: Tab }) => new URLSearchParams(tab === 'models' ? {} : { tab });

/** Ski models with their prices, and the brands they belong to (FR-10…14). The open tab lives in the URL. */
export function ModelsPage() {
  const t = useTranslations('catalogAdmin');
  const { filters, apply } = useUrlFilters({ parse, serialise });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <BrandDialog />
            <ModelDialog />
          </>
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <Tabs value={filters.tab} onValueChange={(tab: Tab) => apply({ tab })} className="gap-0">
          {/* The switch is the top edge of the card: two halves, the open one joined to the table below. */}
          <TabsList className="border-border grid h-auto! w-full grid-cols-2 rounded-none border-b bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="bg-muted/60 data-active:bg-card data-active:text-foreground data-active:after:bg-primary dark:data-active:bg-card h-12 rounded-none border-0 text-base after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:opacity-0 data-active:shadow-none! data-active:after:opacity-100"
                data-testid={`tab-${tab}`}
              >
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="models">
            <ModelsTab />
          </TabsContent>
          <TabsContent value="brands">
            <BrandsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}
