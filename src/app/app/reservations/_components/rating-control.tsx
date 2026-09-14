'use client';

import { StarIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { FormError } from '~/components/common/form-error';
import { ScoreInput } from '~/components/reservations/score-input';
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
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { TIME_FORMAT } from '~/lib/format';
import { canWriteRating, type RatingAccess, RATING_TEXT_MAX_LENGTH } from '~/lib/rating-rules';
import { api } from '~/trpc/react';

export type RatingKind = 'rental' | 'model';

interface RatingControlProps {
  kind: RatingKind;
  reservationId: string;
  /** What is being rated, for the dialog title: the store for a rental, the model for skis. */
  subject: string;
  access: RatingAccess;
  current: { score: number; text: string | null } | null;
  editableUntil: Date | null;
}

/** Rate the rental or the ski model, or show the rating once it is locked (FR-42…44). */
export function RatingControl({ kind, reservationId, subject, access, current, editableUntil }: RatingControlProps) {
  const t = useTranslations('ratings');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (access === 'notEligible') return null;

  const label = t(`${kind}.label`);

  if (!canWriteRating(access)) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm" data-testid={`${kind}-rating-locked`}>
        {label}:
        <StarIcon className="fill-highlight text-highlight size-4" aria-hidden />
        <span className="text-foreground">{t('scoreOutOf', { score: current?.score ?? 0 })}</span>
      </p>
    );
  }

  // Shown in the viewer's own time zone: "until 14:32" is a moment, not a calendar day.
  const until = editableUntil ? new Intl.DateTimeFormat(locale, TIME_FORMAT).format(editableUntil) : null;
  const buttonLabel =
    access === 'create'
      ? t(`${kind}.rate`)
      : access === 'reopen'
        ? t(`${kind}.update`)
        : t(`${kind}.editUntil`, { time: until ?? '' });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={access === 'create' ? 'default' : 'outline'} size="sm" data-testid={`rate-${kind}`} />}
      >
        <StarIcon aria-hidden />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent data-testid={`rate-${kind}-dialog`}>
        {open ? (
          <RatingForm
            kind={kind}
            reservationId={reservationId}
            subject={subject}
            access={access}
            current={current}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface RatingFormProps {
  kind: RatingKind;
  reservationId: string;
  subject: string;
  access: RatingAccess;
  current: { score: number; text: string | null } | null;
  onDone: () => void;
}

function RatingForm({ kind, reservationId, subject, access, current, onDone }: RatingFormProps) {
  const t = useTranslations('ratings');
  const utils = api.useUtils();
  const [score, setScore] = useState<number | undefined>(current?.score);
  const [text, setText] = useState(current?.text ?? '');
  const [submitted, setSubmitted] = useState(false);

  const onSuccess = async () => {
    await utils.reservation.listMine.invalidate();
    onDone();
  };
  const rental = api.rating.upsertReservationRating.useMutation({ onSuccess });
  const model = api.rating.upsertModelRating.useMutation({ onSuccess });
  const mutation = kind === 'rental' ? rental : model;

  function submit() {
    setSubmitted(true);
    if (score === undefined) return;

    if (kind === 'rental') rental.mutate({ reservationId, score, note: text });
    else model.mutate({ reservationId, score, comment: text });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t(`${kind}.title`, { subject })}</DialogTitle>
        <DialogDescription>{access === 'reopen' ? t('reopenHint') : t('windowHint')}</DialogDescription>
      </DialogHeader>

      <ScoreInput
        name={`${kind}-score`}
        label={t('score')}
        value={score}
        onChange={setScore}
        error={submitted && score === undefined ? t('scoreRequired') : undefined}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${kind}-text`}>{t(`${kind}.textLabel`)}</Label>
        <Textarea
          id={`${kind}-text`}
          value={text}
          maxLength={RATING_TEXT_MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder={t(`${kind}.textPlaceholder`)}
          aria-describedby={`${kind}-text-hint`}
        />
        <p id={`${kind}-text-hint`} className="text-muted-foreground text-xs">
          {t('staffOnly')}
        </p>
      </div>

      <FormError message={mutation.error?.message} data-testid="rating-error" />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={mutation.isPending} data-testid="submit-rating">
          {mutation.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
