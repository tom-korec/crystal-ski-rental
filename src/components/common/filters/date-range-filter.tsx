'use client';

import { CalendarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { addDays, fromCalendarDate, toCalendarDate, todayDateString, toUtcDate } from '~/lib/date';
import { MAX_RENTAL_DAYS } from '~/lib/pricing';
import type { DateRange } from '~/lib/rental-range';
import { cn } from '~/lib/utils';

interface DateRangeFilterProps {
  id: string;
  label: string;
  value: DateRange | undefined;
  onChange: (value: DateRange) => void;
  placeholder: string;
  className?: string;
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Rental dates in two clicks: the first click always picks the first day, the second the last one. A
 * second click before the first day starts over from there. (The calendar's own range mode only ever
 * extends a range, which made it impossible to move the first day later.)
 *
 * The two conversions the UI needs happen here and nowhere else: the inclusive last day becomes the
 * exclusive stored end, and local calendar dates become UTC date strings (see `~/lib/date`).
 */
export function DateRangeFilter({ id, label, value, onChange, placeholder, className }: DateRangeFilterProps) {
  const t = useTranslations('filters');
  const formatDateRange = useFormatDateRange();
  const [open, setOpen] = useState(false);
  const [firstDay, setFirstDay] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const committed = value
    ? { from: toCalendarDate(value.startDate), to: toCalendarDate(addDays(value.endDate, -1)) }
    : undefined;
  const selected = firstDay ? { from: firstDay, to: undefined } : committed;
  const today = toCalendarDate(todayDateString());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Closing halfway through keeps the dates that were there before.
    setFirstDay(null);
  }

  function handleDayClick(day: Date, modifiers: { disabled?: boolean }) {
    if (modifiers.disabled) return;

    if (!firstDay || day < firstDay) {
      setFirstDay(day);
      return;
    }

    onChange({ startDate: fromCalendarDate(firstDay), endDate: addDays(fromCalendarDate(day), 1) });
    handleOpenChange(false);
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              aria-labelledby={`${id}-label ${id}`}
              className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
              data-testid={id}
            />
          }
        >
          <CalendarIcon aria-hidden />
          {value ? formatDateRange(toUtcDate(value.startDate), toUtcDate(addDays(value.endDate, -1))) : placeholder}
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          align="start"
          className="w-auto"
          // Focus a day rather than the "previous month" arrow, so Enter picks instead of paging.
          initialFocus={() =>
            contentRef.current?.querySelector<HTMLElement>('[role="grid"] button[tabindex="0"]:not([disabled])') ??
            contentRef.current?.querySelector<HTMLElement>('[role="grid"] button:not([disabled])')
          }
          data-testid={`${id}-calendar`}
        >
          <Calendar
            mode="range"
            weekStartsOn={1}
            selected={selected}
            onDayClick={handleDayClick}
            defaultMonth={selected?.from ?? today}
            numberOfMonths={1}
            // Mirrors the rental window, so the control cannot produce a range the server refuses.
            disabled={[
              { before: today },
              ...(firstDay ? [{ after: addCalendarDays(firstDay, MAX_RENTAL_DAYS - 1) }] : []),
            ]}
            footer={
              <p
                className="text-muted-foreground max-w-64 px-2 pt-2 text-xs"
                aria-live="polite"
                data-testid={`${id}-hint`}
              >
                {firstDay ? t('pickLastDay', { max: MAX_RENTAL_DAYS }) : t('pickFirstDay')}
              </p>
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
