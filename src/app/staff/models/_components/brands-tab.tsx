'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { QueryState } from '~/components/common/query-state';
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
import { BRAND_NAME_MAX_LENGTH, type BrandCreateInput, brandCreateSchema } from '~/lib/brand-schema';
import { api, type RouterOutputs } from '~/trpc/react';

import { DeleteEntryButton } from '~/components/common/delete-entry-button';

type Brand = RouterOutputs['brand']['list'][number];

export function BrandsTab() {
  const t = useTranslations('catalogAdmin');
  const brands = api.brand.list.useQuery();

  return (
    <QueryState query={brands} skeleton={<Skeleton className="h-48 w-full" />}>
      {(rows) => (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t('name')}</TableHead>
                <TableHead scope="col" className="text-right">
                  {t('models')}
                </TableHead>
                <TableHead scope="col" className="w-24">
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((brand) => (
                <BrandRow key={brand.id} brand={brand} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </QueryState>
  );
}

function BrandRow({ brand }: { brand: Brand }) {
  const utils = api.useUtils();
  const remove = api.brand.delete.useMutation();

  return (
    <TableRow data-testid="brand-row">
      <TableCell className="font-medium">{brand.name}</TableCell>
      <TableCell className="text-right tabular-nums">{brand._count.models}</TableCell>
      <TableCell className="flex justify-end gap-1">
        <BrandDialog brand={brand} />
        <DeleteEntryButton
          name={brand.name}
          isPending={remove.isPending}
          error={remove.error?.message}
          onReset={() => remove.reset()}
          onDelete={(done) =>
            remove.mutate(
              { id: brand.id },
              {
                onSuccess: () => {
                  void utils.brand.list.invalidate();
                  done();
                },
              },
            )
          }
        />
      </TableCell>
    </TableRow>
  );
}

export function BrandDialog({ brand }: { brand?: Brand }) {
  const t = useTranslations('catalogAdmin');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {brand ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('editNamed', { name: brand.name })}
              data-testid="edit-entry"
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" data-testid="add-brand" />}>
          <PlusIcon aria-hidden />
          {t('addBrand')}
        </DialogTrigger>
      )}
      <DialogContent data-testid="brand-dialog">
        {open ? <BrandForm brand={brand} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BrandForm({ brand, onDone }: { brand?: Brand; onDone: () => void }) {
  const t = useTranslations('catalogAdmin');
  const utils = api.useUtils();
  const form = useForm<BrandCreateInput>({
    resolver: zodResolver(brandCreateSchema),
    defaultValues: { name: brand?.name ?? '' },
  });
  const onSuccess = async () => {
    await Promise.all([utils.brand.list.invalidate(), utils.skiModel.list.invalidate()]);
    onDone();
  };
  const create = api.brand.create.useMutation({ onSuccess });
  const update = api.brand.update.useMutation({ onSuccess });
  const mutation = brand ? update : create;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) =>
        brand ? update.mutate({ id: brand.id, ...values }) : create.mutate(values),
      )}
    >
      <DialogHeader>
        <DialogTitle>{brand ? t('editBrand') : t('addBrand')}</DialogTitle>
      </DialogHeader>
      <Field
        id="brand-name"
        label={t('name')}
        autoComplete="off"
        error={form.formState.errors.name && t('errors.name', { max: BRAND_NAME_MAX_LENGTH })}
        {...form.register('name')}
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
