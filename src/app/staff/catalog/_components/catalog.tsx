'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '~/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useUrlFilters } from '~/hooks/use-url-filters';

import { BrandDialog, BrandsTab } from './brands-tab';
import { ModelDialog, ModelsTab } from './models-tab';
import { StoreDialog, StoresTab } from './stores-tab';

const TABS = ['models', 'brands', 'stores'] as const;
type Tab = (typeof TABS)[number];

const parse = (params: URLSearchParams): { tab: Tab } => ({
  tab: TABS.find((tab) => tab === params.get('tab')) ?? 'models',
});
const serialise = ({ tab }: { tab: Tab }) => new URLSearchParams(tab === 'models' ? {} : { tab });

/** Brands, models with prices, and stores (FR-10…14). The open tab lives in the URL. */
export function Catalog() {
  const t = useTranslations('catalogAdmin');
  const { filters, apply } = useUrlFilters({ parse, serialise });

  return (
    <Tabs value={filters.tab} onValueChange={(tab: Tab) => apply({ tab })} className="gap-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          filters.tab === 'models' ? <ModelDialog /> : filters.tab === 'brands' ? <BrandDialog /> : <StoreDialog />
        }
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} data-testid={`tab-${tab}`}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </PageHeader>
      <TabsContent value="models">
        <ModelsTab />
      </TabsContent>
      <TabsContent value="brands">
        <BrandsTab />
      </TabsContent>
      <TabsContent value="stores">
        <StoresTab />
      </TabsContent>
    </Tabs>
  );
}
