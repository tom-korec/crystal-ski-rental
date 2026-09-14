/** `12 Dec 2026`. Dates render in UTC, as configured in `~/i18n/config`. */
export const DATE_FORMAT = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

/** `14:32`, for moments such as "editable until". */
export const TIME_FORMAT = { hour: '2-digit', minute: '2-digit' } as const satisfies Intl.DateTimeFormatOptions;

/** "031 01", as Slovak zip codes are written; stored without the space. */
export function formatZipCode(zipCode: string): string {
  return /^\d{5}$/.test(zipCode) ? `${zipCode.slice(0, 3)} ${zipCode.slice(3)}` : zipCode;
}

/** "+421 903 123 456": the country code, then groups of three. Other formats are shown as stored. */
export function formatPhone(phone: string): string {
  const match = /^\+(42[01])(\d{9})$/.exec(phone);
  return match?.[2] ? `+${match[1]} ${match[2].replace(/(\d{3})(?=\d)/g, '$1 ')}` : phone;
}
