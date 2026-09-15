'use client';

import { TicketIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
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
import { RESERVATION_CODE_LENGTH, reservationCodeSchema } from '~/lib/reservation-code';
import { staffReservationRoute } from '~/lib/routes';
import { api } from '~/trpc/react';

/** At the counter: the code the customer quotes opens their reservation (FR-45). */
export function FindByCodeDialog() {
  const t = useTranslations('frontDesk');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button data-testid="find-by-code" />}>
        <TicketIcon aria-hidden />
        {t('findByCode')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" data-testid="find-by-code-dialog">
        {open ? <FindByCodeForm /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FindByCodeForm() {
  const t = useTranslations('frontDesk');
  const router = useRouter();
  const utils = api.useUtils();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    const code = reservationCodeSchema.safeParse(value);
    if (!code.success) {
      setError(t('codeInvalid', { length: RESERVATION_CODE_LENGTH }));
      return;
    }

    setIsPending(true);
    setError(undefined);
    try {
      const reservation = await utils.reservation.byCode.fetch({ code: code.data });
      router.push(staffReservationRoute(reservation.id));
    } catch {
      setError(t('codeNotFound', { code: code.data }));
      setIsPending(false);
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('findByCodeTitle')}</DialogTitle>
        <DialogDescription>{t('findByCodeDescription')}</DialogDescription>
      </DialogHeader>
      <Field
        id="reservation-code-input"
        label={t('code')}
        placeholder="K7QX2M"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        maxLength={RESERVATION_CODE_LENGTH + 3}
        className="font-mono text-lg tracking-widest uppercase"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <FormError message={error} data-testid="find-by-code-error" />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={isPending || value.trim() === ''} data-testid="open-reservation">
          {isPending ? t('finding') : t('openReservation')}
        </Button>
      </DialogFooter>
    </form>
  );
}
