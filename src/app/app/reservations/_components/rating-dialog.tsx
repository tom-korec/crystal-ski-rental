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

export interface ModelRatingPart extends RatingPart {
  modelId: string;
  /** Brand and model, e.g. "Atomic Redster G9". */
  name: string;
}

interface RatingDialogProps {
  action: RatingAction;
  reservationId: string;
  store: string;
  rental: RatingPart;
  models: ModelRatingPart[];
}

/** Rate the rental and every ski model in it together, or change them while the edit window is open (FR-42…44). */
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="rating-dialog">
        {open ? <RatingForm action={action} {...props} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

interface RatingFormProps extends RatingDialogProps {
  onDone: () => void;
}

interface Draft {
  score: number | undefined;
  text: string;
}

function draftOf(part: RatingPart): Draft {
  return { score: part.current?.score, text: part.current?.text ?? '' };
}

function RatingForm({ action, reservationId, store, rental, models, onDone }: RatingFormProps) {
  const t = useTranslations('ratings');
  const locale = useLocale();
  const utils = api.useUtils();
  const [rentalDraft, setRentalDraft] = useState(draftOf(rental));
  const [modelDrafts, setModelDrafts] = useState(() => models.map(draftOf));
  const [submitted, setSubmitted] = useState(false);

  const rate = api.rating.rate.useMutation({
    onSuccess: async () => {
      await utils.reservation.listMine.invalidate();
      onDone();
    },
  });

  const writesRental = canWriteRating(rental.access);
  const windows = [rental, ...models].map((part) => part.editableUntil).filter((end) => end !== null);
  // Everything is saved together, so the windows close together; the earliest one is the safe answer.
  const until = windows.length > 0 ? new Date(Math.min(...windows.map((end) => end.getTime()))) : null;

  function submit() {
    setSubmitted(true);

    const writtenModels = models.flatMap((model, index) => {
      const draft = modelDrafts[index];
      return canWriteRating(model.access) && draft ? [{ model, draft }] : [];
    });
    const rentalScore = rentalDraft.score;
    if ((writesRental && rentalScore === undefined) || writtenModels.some(({ draft }) => draft.score === undefined)) {
      return;
    }

    rate.mutate({
      reservationId,
      rental: writesRental && rentalScore !== undefined ? { score: rentalScore, note: rentalDraft.text } : undefined,
      models: writtenModels.flatMap(({ model, draft }) =>
        draft.score === undefined ? [] : [{ modelId: model.modelId, score: draft.score, comment: draft.text }],
      ),
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

      <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
        <RatingSection
          id="rental"
          kind="rental"
          title={t('rental.title', { store })}
          part={rental}
          draft={rentalDraft}
          onChange={setRentalDraft}
          submitted={submitted}
        />
        {models.map((model, index) => (
          <RatingSection
            key={model.modelId}
            id={`model-${index}`}
            kind="model"
            title={t('model.title', { skis: model.name })}
            part={model}
            draft={modelDrafts[index] ?? draftOf(model)}
            onChange={(draft) => setModelDrafts((drafts) => drafts.with(index, draft))}
            submitted={submitted}
          />
        ))}
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

interface RatingSectionProps {
  /** Unique within the dialog: names the inputs and the test ids. */
  id: string;
  kind: 'rental' | 'model';
  title: string;
  part: RatingPart;
  draft: Draft;
  onChange: (draft: Draft) => void;
  submitted: boolean;
}

function RatingSection({ id, kind, title, part, draft, onChange, submitted }: RatingSectionProps) {
  const t = useTranslations('ratings');
  const textId = `${id}-text`;

  return (
    <section className="flex flex-col gap-4" data-testid={`${id}-rating-section`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        {part.access === 'reopen' ? <p className="text-muted-foreground text-sm">{t('model.reopenHint')}</p> : null}
      </div>

      {canWriteRating(part.access) ? (
        <>
          <ScoreInput
            name={`${id}-score`}
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
              rows={3}
              maxLength={RATING_TEXT_MAX_LENGTH}
              onChange={(event) => onChange({ ...draft, text: event.target.value })}
              placeholder={t(`${kind}.textPlaceholder`)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 text-sm" data-testid={`${id}-rating-locked`}>
          {part.current ? <StarScore score={part.current.score} /> : null}
          {part.current?.text ? <p className="text-muted-foreground">“{part.current.text}”</p> : null}
          <p className="text-muted-foreground text-xs">{t('locked')}</p>
        </div>
      )}
    </section>
  );
}
