/** `12 Dec 2026`. Dates render in UTC, as configured in `~/i18n/config`. */
export const DATE_FORMAT = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

/** `14:32`, for moments such as "editable until". */
export const TIME_FORMAT = { hour: '2-digit', minute: '2-digit' } as const satisfies Intl.DateTimeFormatOptions;
