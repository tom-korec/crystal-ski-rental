import type { Messages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, type Locale, TIME_ZONE } from './config';

// One loader per locale: a template-literal `import()` would type the messages as `any`.
const messageLoaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('../../messages/en.json'),
};

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await messageLoaders[locale]()).default,
  };
});
