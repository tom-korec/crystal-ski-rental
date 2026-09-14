import type { Locale } from '~/i18n/config';

import type messages from '../messages/en.json';

// Registers the catalogue with next-intl, so a missing or misspelled message key is a compile error.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
