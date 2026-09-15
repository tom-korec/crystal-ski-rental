'use client';

import { PencilIcon, StarIcon } from 'lucide-react';
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
import { canWriteRating, type RatingAccess, type RatingAction, RATING_TEXT_MAX_LENGTH } from '~/lib/rating-rules';
import { api } from '~/trpc/react';

import { StarScore } from './star-score';

export interface RatingPart {
  access: RatingAccess;
  current: { score: number; text: string | null } | null;
  /** When the open edit window of this reservation closes, if one is open. */
  editableUntil: Date | null;
}

interface RatingDialogProps {
  action: RatingAction;
  reservationId: string;
  store: string;
  skis: string;
  rental: RatingPart;
  model: RatingPart;
}

/** Rate the rental and the skis together, or change both while the edit window is open (FR-42…44). */
export function RatingDialog({ action, ...props }: RatingDialogProps) {
  const t = useTranslations('ratings');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={action === 'rate' ? 'default' : 'outline'}
            size="sm"
            data-testid="rate-reservation"
            data-action={action}
          />
        }
      >
        {action === 'rate' ? <StarIcon aria-hidden /> : <PencilIcon aria-hidden />}
        {t(action === 'rate' ? 'rate' : 'edit')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" data-testid="rating-dialog">
        {open ? <RatingForm action={action} {...props} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

interface RatingFormProps extends Omit<RatingDialogProps, 'action'> {
  action: RatingAction;
  onDone: () => void;
}

function RatingForm({ action, reservationId, store, skis, rental, model, onDone }: RatingFormProps) {
  const t = useTranslations('ratings');
  const locale = useLocale();
  const utils = api.useUtils();
  const [rentalDraft, setRentalDraft] = useState(draftOf(rental));
  const [modelDraft, setModelDraft] = useState(draftOf(model));
  const [submitted, setSubmitted] = useState(false);

  const rate = api.rating.rate.useMutation({
    onSuccess: async () => {
      await utils.reservation.listMine.invalidate();
      onDone();
    },
  });

  const writesRental = canWriteRating(rental.access);
  const writesModel = canWriteRating(model.access);

  const windows = [rental.editableUntil, model.editableUntil].filter((end) => end !== null);
  // Both ratings are saved together, so their windows close together; the earlier one is the safe answer.
  const until = windows.length > 0 ? new Date(Math.min(...windows.map((end) => end.getTime()))) : null;

  function submit() {
    setSubmitted(true);
    if ((writesRental && rentalDraft.score === undefined) || (writesModel && modelDraft.score === undefined)) return;

    rate.mutate({
      reservationId,
      rental:
        writesRental && rentalDraft.score !== undefined
          ? { score: rentalDraft.score, note: rentalDraft.text }
          : undefined,
      model:
        writesModel && modelDraft.score !== undefined
          ? { score: modelDraft.score, comment: modelDraft.text }
          : undefined,
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t(action === 'rate' ? 'rateTitle' : 'editTitle')}</DialogTitle>
        <DialogDescription data-testid="rating-window">
          {action === 'edit' && until
            ? t('editableUntil', { time: new Intl.DateTimeFormat(locale, TIME_FORMAT).format(until) })
            : t('editableForAnHour')}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <RatingSection
          kind="rental"
          title={t('rental.title', { store })}
          part={rental}
          draft={rentalDraft}
          onChange={setRentalDraft}
          submitted={submitted}
        />
        <RatingSection
          kind="model"
          title={t('model.title', { skis })}
          part={model}
          draft={modelDraft}
          onChange={setModelDraft}
          submitted={submitted}
        />
      </div>

      <p className="text-muted-foreground text-xs">{t('staffOnly')}</p>

      <FormError message={rate.error?.message} data-testid="rating-error" />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={rate.isPending} data-testid="submit-rating">
          {rate.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface Draft {
  score: number | undefined;
  text: string;
}

function draftOf(part: RatingPart): Draft {
  return { score: part.current?.score, text: part.current?.text ?? '' };
}

interface RatingSectionProps {
  kind: 'rental' | 'model';
  title: string;
  part: RatingPart;
  draft: Draft;
  onChange: (draft: Draft) => void;
  submitted: boolean;
}

function RatingSection({ kind, title, part, draft, onChange, submitted }: RatingSectionProps) {
  const t = useTranslations('ratings');
  const textId = `${kind}-text`;

  return (
    <section className="flex flex-col gap-4" data-testid={`${kind}-rating-section`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        {part.access === 'reopen' ? <p className="text-muted-foreground text-sm">{t('model.reopenHint')}</p> : null}
      </div>

      {canWriteRating(part.access) ? (
        <>
          <ScoreInput
            name={`${kind}-score`}
            label={t('score')}
            value={draft.score}
            onChange={(score) => onChange({ ...draft, score })}
            error={submitted && draft.score === undefined ? t('scoreRequired') : undefined}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor={textId}>{t(`${kind}.textLabel`)}</Label>
            <Textarea
              id={textId}
              value={draft.text}
              rows={4}
              maxLength={RATING_TEXT_MAX_LENGTH}
              onChange={(event) => onChange({ ...draft, text: event.target.value })}
              placeholder={t(`${kind}.textPlaceholder`)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 text-sm" data-testid={`${kind}-rating-locked`}>
          {part.current ? <StarScore score={part.current.score} /> : null}
          {part.current?.text ? <p className="text-muted-foreground">“{part.current.text}”</p> : null}
          <p className="text-muted-foreground text-xs">{t('locked')}</p>
        </div>
      )}
    </section>
  );
}
