export const LOCALES = ['en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Rentals are whole days stored as UTC dates. Formatting in the viewer's zone would shift them and
 * make server and client disagree during hydration.
 */
export const TIME_ZONE = 'UTC';
