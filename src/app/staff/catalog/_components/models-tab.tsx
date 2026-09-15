'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { QueryState } from '~/components/common/query-state';
import { SelectField } from '~/components/common/select-field';
import { RatingSummary } from '~/components/skis/rating-summary';
import { SkiBadges } from '~/components/skis/ski-badges';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useFormatMoney } from '~/hooks/use-format-money';
import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import { SKI_MODEL_NAME_MAX_LENGTH, skiModelCreateSchema } from '~/lib/ski-model-schema';
import { api, type RouterOutputs } from '~/trpc/react';

import { DeleteEntryButton } from './delete-entry-button';
import { ModelRatingsDialog } from './model-ratings-dialog';

type SkiModel = RouterOutputs['skiModel']['list'][number];
type ModelInput = z.input<typeof skiModelCreateSchema>;
type ModelOutput = z.output<typeof skiModelCreateSchema>;

export function ModelsTab() {
  const t = useTranslations('catalogAdmin');
  const models = api.skiModel.list.useQuery({});

  return (
    <div className="flex flex-col gap-4">
      <QueryState query={models} skeleton={<Skeleton className="h-64 w-full" />}>
        {(rows) => (
          <div className="bg-card ring-foreground/10 overflow-x-auto rounded-xl ring-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('model')}</TableHead>
                  <TableHead scope="col">{t('attributes')}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t('pricePerDay')}
                  </TableHead>
                  <TableHead scope="col">{t('rating')}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t('skis')}
                  </TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">{t('actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((model) => (
                  <ModelRow key={model.id} model={model} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function ModelRow({ model }: { model: SkiModel }) {
  const formatMoney = useFormatMoney();
  const utils = api.useUtils();
  const remove = api.skiModel.delete.useMutation();
  const name = `${model.brand.name} ${model.name}`;

  return (
    <TableRow data-testid="model-row">
      <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
      <TableCell>
        <SkiBadges type={model.type} gender={model.gender} skillLevel={model.skillLevel} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(model.pricePerDay)}</TableCell>
      <TableCell className="whitespace-nowrap">
        <ModelRatingsDialog modelId={model.id} name={name} ratingCount={model.ratingCount}>
          <RatingSummary avgRating={model.avgRating} ratingCount={model.ratingCount} />
        </ModelRatingsDialog>
      </TableCell>
      <TableCell className="text-right tabular-nums">{model.skiCount}</TableCell>
      <TableCell>
        <span className="flex justify-end gap-1">
          <ModelDialog model={model} />
          <DeleteEntryButton
            name={name}
            isPending={remove.isPending}
            error={remove.error?.message}
            onReset={() => remove.reset()}
            onDelete={(done) =>
              remove.mutate(
                { id: model.id },
                {
                  onSuccess: () => {
                    void Promise.all([utils.skiModel.list.invalidate(), utils.brand.list.invalidate()]);
                    done();
                  },
                },
              )
            }
          />
        </span>
      </TableCell>
    </TableRow>
  );
}

export function ModelDialog({ model }: { model?: SkiModel }) {
  const t = useTranslations('catalogAdmin');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {model ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('editNamed', { name: `${model.brand.name} ${model.name}` })}
              data-testid="edit-entry"
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button data-testid="add-model" />}>
          <PlusIcon aria-hidden />
          {t('addModel')}
        </DialogTrigger>
      )}
      <DialogContent data-testid="model-dialog">
        {open ? <ModelForm model={model} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ModelForm({ model, onDone }: { model?: SkiModel; onDone: () => void }) {
  const t = useTranslations('catalogAdmin');
  const tCatalog = useTranslations('catalog');
  const utils = api.useUtils();
  const brands = api.brand.list.useQuery();

  const form = useForm<ModelInput, unknown, ModelOutput>({
    resolver: zodResolver(skiModelCreateSchema),
    defaultValues: model
      ? {
          brandId: model.brand.id,
          name: model.name,
          type: model.type,
          gender: model.gender,
          skillLevel: model.skillLevel,
          pricePerDay: model.pricePerDay,
        }
      : { name: '', pricePerDay: '' },
  });
  const { errors } = form.formState;

  // Existing reservations keep the price they were booked at (BR-5); the list and searches change now.
  const onSuccess = async () => {
    await Promise.all([utils.skiModel.list.invalidate(), utils.brand.list.invalidate(), utils.ski.invalidate()]);
    onDone();
  };
  const create = api.skiModel.create.useMutation({ onSuccess });
  const update = api.skiModel.update.useMutation({ onSuccess });
  const mutation = model ? update : create;

  const select = (
    name: 'brandId' | 'type' | 'gender' | 'skillLevel',
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <SelectField
          id={`model-${name}`}
          label={label}
          placeholder={t('choose')}
          options={options}
          value={field.value}
          onChange={field.onChange}
          error={errors[name] && t('errors.choose')}
        />
      )}
    />
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) =>
        model ? update.mutate({ id: model.id, ...values }) : create.mutate(values),
      )}
    >
      <DialogHeader>
        <DialogTitle>{model ? t('editModel') : t('addModel')}</DialogTitle>
      </DialogHeader>
      {select(
        'brandId',
        t('brand'),
        (brands.data ?? []).map((brand) => ({ value: brand.id, label: brand.name })),
      )}
      <Field
        id="model-name"
        label={t('name')}
        autoComplete="off"
        error={errors.name && t('errors.name', { max: SKI_MODEL_NAME_MAX_LENGTH })}
        {...form.register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {select(
          'type',
          t('type'),
          SKI_TYPES.map((value) => ({ value, label: tCatalog(`type.${value}`) })),
        )}
        {select(
          'gender',
          t('gender'),
          SKI_GENDERS.map((value) => ({ value, label: tCatalog(`gender.${value}`) })),
        )}
        {select(
          'skillLevel',
          t('level'),
          SKILL_LEVELS.map((value) => ({ value, label: tCatalog(`level.${value}`) })),
        )}
      </div>
      <Field
        id="model-price"
        label={t('pricePerDayEur')}
        inputMode="decimal"
        autoComplete="off"
        hint={model ? t('priceChangeHint') : undefined}
        error={errors.pricePerDay && t('errors.price')}
        {...form.register('pricePerDay')}
      />
      <FormError message={mutation.error?.message} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={mutation.isPending} data-testid="save-entry">
          {mutation.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
