'use client';

import { CalendarPlusIcon, PencilIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { DeleteEntryButton } from '~/components/common/delete-entry-button';
import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import type { DirectoryStore } from '~/components/stores/store-directory';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { todayDateString, toUtcDate } from '~/lib/date';
import { formatOpeningHours, type SpecialDay, specialDaySchema } from '~/lib/opening-hours';
import { api } from '~/trpc/react';

interface SpecialDaysProps {
  store: DirectoryStore;
  /** Admins keep them; managers read them. */
  canEdit: boolean;
}

/** A store's upcoming special days: holidays with other hours and closures (BR-7). */
export function SpecialDays({ store, canEdit }: SpecialDaysProps) {
  const t = useTranslations('specialDays');
  const format = useFormatter();
  const today = todayDateString();
  const upcoming = store.specialDays.filter((day) => day.date >= today);

  return (
    <Card data-testid="special-days">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>
            <h2>{t('title')}</h2>
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        {canEdit ? <SpecialDayDialog storeId={store.id} /> : null}
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('date')}</TableHead>
                  <TableHead scope="col">{t('name')}</TableHead>
                  <TableHead scope="col">{t('hours')}</TableHead>
                  {canEdit ? (
                    <TableHead scope="col">
                      <span className="sr-only">{t('actions')}</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((day) => (
                  <TableRow key={day.date} data-testid="special-day-row">
                    <TableCell className="whitespace-nowrap">
                      {format.dateTime(toUtcDate(day.date), {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </TableCell>
                    <TableCell>{day.name ?? '—'}</TableCell>
                    <TableCell className={day.hours ? undefined : 'text-destructive font-medium'}>
                      {formatOpeningHours(day.hours) ?? t('closed')}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <span className="flex justify-end gap-1">
                          <SpecialDayDialog storeId={store.id} day={day} />
                          <RemoveSpecialDay storeId={store.id} day={day} />
                        </span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemoveSpecialDay({ storeId, day }: { storeId: string; day: SpecialDay }) {
  const utils = api.useUtils();
  const remove = api.store.removeSpecialDay.useMutation();

  return (
    <DeleteEntryButton
      name={day.name ?? day.date}
      isPending={remove.isPending}
      error={remove.error?.message}
      onReset={() => remove.reset()}
      onDelete={(done) =>
        remove.mutate(
          { storeId, date: day.date },
          {
            onSuccess: () => {
              void utils.store.invalidate();
              done();
            },
          },
        )
      }
    />
  );
}

interface SpecialDayDialogProps {
  storeId: string;
  /** Edits this day; without one, adds a day. */
  day?: SpecialDay;
}

function SpecialDayDialog({ storeId, day }: SpecialDayDialogProps) {
  const t = useTranslations('specialDays');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {day ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('editNamed', { name: day.name ?? day.date })}
              data-testid="edit-special-day"
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" data-testid="add-special-day" />}>
          <CalendarPlusIcon aria-hidden />
          {t('add')}
        </DialogTrigger>
      )}
      <DialogContent data-testid="special-day-dialog">
        {open ? <SpecialDayForm storeId={storeId} day={day} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type SpecialDayForm = z.input<typeof specialDaySchema> & { closed: boolean };

function SpecialDayForm({ storeId, day, onDone }: SpecialDayDialogProps & { onDone: () => void }) {
  const t = useTranslations('specialDays');
  const utils = api.useUtils();
  const form = useForm<SpecialDayForm>({
    defaultValues: {
      date: day?.date ?? '',
      name: day?.name ?? '',
      hours: day?.hours ?? '',
      closed: day ? day.hours === null : false,
    },
  });
  const closed = useWatch({ control: form.control, name: 'closed' });
  const [errors, setErrors] = useState<Partial<Record<'date' | 'hours' | 'name', string>>>({});
  const save = api.store.setSpecialDay.useMutation({
    onSuccess: async () => {
      await utils.store.invalidate();
      onDone();
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(({ closed: isClosed, ...values }) => {
        const parsed = specialDaySchema.safeParse({ ...values, hours: isClosed ? null : values.hours });
        if (!parsed.success || (!isClosed && parsed.data.hours === null)) {
          const fields = new Set(
            parsed.success ? ['hours'] : parsed.error.issues.map((issue) => String(issue.path[0])),
          );
          setErrors({
            date: fields.has('date') ? t('errors.date') : undefined,
            hours: fields.has('hours') ? t('errors.hours') : undefined,
            name: fields.has('name') ? t('errors.name') : undefined,
          });
          return;
        }
        setErrors({});
        save.mutate({ storeId, ...parsed.data });
      })}
    >
      <DialogHeader>
        <DialogTitle>{day ? t('editTitle') : t('addTitle')}</DialogTitle>
        <DialogDescription>{t('dialogDescription')}</DialogDescription>
      </DialogHeader>
      <Field
        id="special-day-date"
        label={t('date')}
        type="date"
        min={todayDateString()}
        readOnly={day !== undefined}
        error={errors.date}
        {...form.register('date')}
      />
      <Field
        id="special-day-name"
        label={t('nameOptional')}
        placeholder={t('namePlaceholder')}
        error={errors.name}
        {...form.register('name')}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-primary size-4"
          {...form.register('closed')}
          data-testid="special-day-closed"
        />
        {t('closedAllDay')}
      </label>
      {closed ? null : (
        <Field
          id="special-day-hours"
          label={t('hours')}
          placeholder="9:00-12:00"
          hint={t('hoursHint')}
          error={errors.hours}
          {...form.register('hours')}
        />
      )}
      <FormError message={save.error?.message} data-testid="special-day-error" />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={save.isPending} data-testid="save-special-day">
          {save.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
