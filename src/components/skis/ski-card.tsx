'use client';

import { MapPinIcon, RulerIcon, StarIcon, UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Card } from '~/components/ui/card';
import { useFormatMoney } from '~/hooks/use-format-money';
import { type SkiGender, type SkillLevel, SKILL_LEVELS, type SkiType } from '~/lib/catalog';
import type { RentalQuote } from '~/lib/pricing';
import { MAX_LENGTH_CM, MIN_LENGTH_CM } from '~/lib/ski-schema';
import { cn } from '~/lib/utils';

export interface SkiCardData {
  id: string;
  lengthCm: number;
  model: {
    name: string;
    type: SkiType;
    gender: SkiGender;
    skillLevel: SkillLevel;
    pricePerDay: string;
    avgRating: number | null;
    ratingCount: number;
    brand: { name: string };
  };
  store: { name: string };
}

interface SkiCardProps {
  ski: SkiCardData;
  /** The price for the searched dates, shown with its discount (FR-32). */
  quote?: RentalQuote;
  /** Staff only: customers never see inventory codes (BR-50). */
  inventoryCode?: string;
  status?: ReactNode;
  action?: ReactNode;
  /** Off in the customer search, where every result is from the store searched. */
  showStore?: boolean;
}

/** One pair of skis: what it is, who it suits, how it is rated, and what it costs. */
export function SkiCard({ ski, quote, inventoryCode, status, action, showStore = true }: SkiCardProps) {
  const t = useTranslations('skis');
  const tCatalog = useTranslations('catalog');
  const formatMoney = useFormatMoney();
  const { model } = ski;

  return (
    <Card
      className="group/ski hover:ring-primary/30 h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
      data-testid="ski-card"
      data-ski-id={ski.id}
    >
      <div className="from-secondary via-muted to-card relative h-28 bg-linear-to-br">
        <SkiSilhouette lengthCm={ski.lengthCm} />
        <span className="bg-card/85 text-foreground absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium shadow-xs backdrop-blur">
          {tCatalog(`type.${model.type}`)}
        </span>
        <span className="absolute top-3 right-3">
          <RatingPill avgRating={model.avgRating} ratingCount={model.ratingCount} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {model.brand.name}
            </span>
            <h3 className="truncate text-lg leading-snug font-semibold">{model.name}</h3>
          </div>
          {inventoryCode ? (
            <span
              className="bg-secondary text-secondary-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-xs"
              data-testid="inventory-code"
            >
              {inventoryCode}
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <Spec icon={<RulerIcon aria-hidden />} label={t('lengthLabel')}>
            {t('length', { length: ski.lengthCm })}
          </Spec>
          <Spec icon={<UserIcon aria-hidden />} label={t('forLabel')}>
            {tCatalog(`gender.${model.gender}`)}
          </Spec>
          <Spec icon={<SkillMeter level={model.skillLevel} />} label={t('levelLabel')}>
            {tCatalog(`level.${model.skillLevel}`)}
          </Spec>
        </dl>

        {showStore || status ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {showStore ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPinIcon className="size-3.5" aria-hidden />
                <span className="sr-only">{t('store')}: </span>
                {ski.store.name}
              </span>
            ) : null}
            {status}
          </div>
        ) : null}

        <div className="border-border mt-auto flex items-center justify-between gap-3 border-t pt-4">
          {quote ? (
            // The days and their discount are shown by the dates; the card carries only what this pair costs.
            <span className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="quote-total">
              {formatMoney(quote.totalPrice)}
            </span>
          ) : (
            <span className="text-lg font-semibold tabular-nums">
              {t('pricePerDay', { price: formatMoney(model.pricePerDay) })}
            </span>
          )}
          {action}
        </div>
      </div>
    </Card>
  );
}

interface SpecProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

function Spec({ icon, label, children }: SpecProps) {
  return (
    <div className="bg-muted/60 flex min-w-0 flex-col gap-1 rounded-lg px-2.5 py-2">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="truncate font-medium">{children}</dd>
    </div>
  );
}

interface SkillMeterProps {
  level: SkillLevel;
}

/** Beginner, intermediate and expert as one, two and three filled bars. */
function SkillMeter({ level }: SkillMeterProps) {
  const filled = SKILL_LEVELS.indexOf(level) + 1;

  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
      {SKILL_LEVELS.map((step, index) => (
        <span
          key={step}
          className={cn('w-1 rounded-full', index < filled ? 'bg-primary' : 'bg-muted-foreground/30')}
          style={{ height: `${40 + index * 30}%` }}
        />
      ))}
    </span>
  );
}

interface RatingPillProps {
  avgRating: number | null;
  ratingCount: number;
}

function RatingPill({ avgRating, ratingCount }: RatingPillProps) {
  const t = useTranslations('skis');
  const pill = 'bg-card/85 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs shadow-xs backdrop-blur';

  if (avgRating === null) return <span className={cn(pill, 'text-muted-foreground')}>{t('notRated')}</span>;

  return (
    <span className={pill}>
      <StarIcon className="fill-highlight text-highlight size-3.5" aria-hidden />
      <span className="font-semibold">{avgRating.toFixed(1)}</span>
      <span className="text-muted-foreground">({ratingCount})</span>
      <span className="sr-only">{t('rating', { score: avgRating.toFixed(1), count: ratingCount })}</span>
    </span>
  );
}

interface SkiSilhouetteProps {
  lengthCm: number;
}

/**
 * A pair of skis drawn to scale against the shortest and longest the fleet allows, so a glance at the
 * cards compares lengths. Decorative: the length is also written out.
 */
function SkiSilhouette({ lengthCm }: SkiSilhouetteProps) {
  const share = Math.min(1, Math.max(0, (lengthCm - MIN_LENGTH_CM) / (MAX_LENGTH_CM - MIN_LENGTH_CM)));
  const width = 120 + share * 150;
  const x = (300 - width) / 2;

  const ski = (y: number) =>
    `M ${x + 14} ${y} H ${x + width - 6} Q ${x + width} ${y} ${x + width} ${y + 5} Q ${x + width} ${y + 10} ${x + width - 6} ${y + 10} H ${x + 14} Q ${x} ${y + 10} ${x - 4} ${y - 2} Q ${x + 4} ${y} ${x + 14} ${y} Z`;

  return (
    <svg
      viewBox="0 0 300 112"
      className="absolute inset-0 size-full transition-transform duration-500 group-hover/ski:-translate-y-0.5"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g transform="rotate(-8 150 60)">
        <path d={ski(54)} className="fill-primary/25" />
        <path d={ski(68)} className="fill-primary/60" />
        <rect x={146} y={51} width={20} height={30} rx={4} className="fill-foreground/70" />
      </g>
    </svg>
  );
}
