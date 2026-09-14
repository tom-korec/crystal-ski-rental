'use client';

import { CalendarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { DateRange as PickerRange } from 'react-day-picker';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { addDays, fromCalendarDate, toCalendarDate, todayDateString, toUtcDate } from '~/lib/date';
import { MAX_RENTAL_DAYS } from '~/lib/pricing';
import type { DateRange } from '~/lib/rental-range';

interface DateRangeFilterProps {
  id: string;
  label: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
}

/**
 * Rental dates picked in a calendar. The two conversions the UI needs happen here and nowhere else:
 * the calendar's inclusive last day becomes the exclusive stored end, and local calendar dates become
 * UTC date strings (see `~/lib/date`).
 */
export function DateRangeFilter({ id, label, value, onChange }: DateRangeFilterProps) {
  const t = useTranslations('filters');
  const formatDateRange = useFormatDateRange();
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const selected: PickerRange = {
    from: toCalendarDate(value.startDate),
    to: toCalendarDate(addDays(value.endDate, -1)),
  };

  function handleSelect(range: PickerRange | undefined) {
    // Clicking the only selected day again would clear the range; a search always needs one.
    const from = range?.from ?? selected.from;
    if (!from) return;

    const startDate = fromCalendarDate(from);
    const endDate = addDays(fromCalendarDate(range?.to ?? from), 1);
    // Longer than the rental window: keep the start and cut the range to the longest allowed.
    const longest = addDays(startDate, MAX_RENTAL_DAYS);

    onChange({ startDate, endDate: endDate > longest ? longest : endDate });
  }

  const today = toCalendarDate(todayDateString());

  return (
    <div className="flex flex-col gap-2">
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              aria-labelledby={`${id}-label ${id}`}
              className="w-full justify-start font-normal"
              data-testid={id}
            />
          }
        >
          <CalendarIcon aria-hidden />
          {formatDateRange(toUtcDate(value.startDate), toUtcDate(addDays(value.endDate, -1)))}
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
        >
          <Calendar
            mode="range"
            weekStartsOn={1}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected.from}
            numberOfMonths={1}
            // Mirrors the rental window, so the control cannot produce a range the server refuses.
            disabled={{ before: today }}
            footer={
              <p className="text-muted-foreground px-2 pt-2 text-xs">{t('datesHint', { max: MAX_RENTAL_DAYS })}</p>
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
