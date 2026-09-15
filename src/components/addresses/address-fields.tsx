'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { SelectField } from '~/components/common/select-field';

export type AddressFieldName =
  'recipient' | 'companyId' | 'vatId' | 'street' | 'houseNumber' | 'city' | 'zipCode' | 'country';

/** The countries offered first. Any other saved country is still shown. */
const COUNTRIES = ['SK', 'CZ', 'PL', 'HU', 'AT', 'DE', 'UA', 'GB', 'IT', 'FR', 'NL', 'BE', 'CH', 'US'];

interface AddressFieldsProps {
  /** Prefixes every input id, so two address forms can share a page. */
  idPrefix: string;
  /** Invoice addresses also name who the invoice is for, with optional company numbers. */
  kind: 'MAILING' | 'INVOICE';
  register: (field: Exclude<AddressFieldName, 'country'>) => UseFormRegisterReturn;
  errors: Partial<Record<AddressFieldName, unknown>>;
  country: string;
  onCountryChange: (country: string) => void;
}

/** The inputs of one postal address (FR-6), for a form that owns the values. */
export function AddressFields({ idPrefix, kind, register, errors, country, onCountryChange }: AddressFieldsProps) {
  const t = useTranslations('addresses');
  const locale = useLocale();
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRIES.includes(country) || !country ? COUNTRIES : [country, ...COUNTRIES];

  return (
    <div className="flex flex-col gap-4">
      {kind === 'INVOICE' ? (
        <>
          <Field
            id={`${idPrefix}-recipient`}
            label={t('recipient')}
            hint={t('recipientHint')}
            autoComplete="organization"
            error={errors.recipient ? t('errors.recipient') : undefined}
            {...register('recipient')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${idPrefix}-company-id`}
              label={t('companyId')}
              autoComplete="off"
              error={errors.companyId ? t('errors.companyId') : undefined}
              {...register('companyId')}
            />
            <Field
              id={`${idPrefix}-vat-id`}
              label={t('vatId')}
              autoComplete="off"
              error={errors.vatId ? t('errors.vatId') : undefined}
              {...register('vatId')}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <Field
          id={`${idPrefix}-street`}
          label={t('street')}
          autoComplete="address-line1"
          error={errors.street ? t('errors.required') : undefined}
          {...register('street')}
        />
        <Field
          id={`${idPrefix}-house-number`}
          label={t('houseNumber')}
          autoComplete="off"
          error={errors.houseNumber ? t('errors.required') : undefined}
          {...register('houseNumber')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <Field
          id={`${idPrefix}-zip-code`}
          label={t('zipCode')}
          autoComplete="postal-code"
          error={errors.zipCode ? t('errors.zipCode') : undefined}
          {...register('zipCode')}
        />
        <Field
          id={`${idPrefix}-city`}
          label={t('city')}
          autoComplete="address-level2"
          error={errors.city ? t('errors.required') : undefined}
          {...register('city')}
        />
      </div>
      <SelectField
        id={`${idPrefix}-country`}
        label={t('country')}
        placeholder={t('country')}
        options={countries.map((code) => ({ value: code, label: names.of(code) ?? code }))}
        value={country}
        onChange={onCountryChange}
        error={errors.country ? t('errors.country') : undefined}
      />
    </div>
  );
}
