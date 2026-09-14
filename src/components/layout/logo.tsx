import { useTranslations } from 'next-intl';

import { cn } from '~/lib/utils';

const ARM_ANGLES = [0, 60, 120];

interface LogoMarkProps {
  className?: string;
}

/** "Ski Flake": three crossed skis forming a six-armed snow crystal. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('size-8', className)}>
      {ARM_ANGLES.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 24 24)`}>
          <rect x="22" y="3.5" width="4" height="41" rx="2" className="fill-primary" />
          <path
            d="M18.5 10 L24 14.5 L29.5 10 M18.5 38 L24 33.5 L29.5 38"
            fill="none"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-foreground"
          />
        </g>
      ))}
    </svg>
  );
}

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const t = useTranslations('app');

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight">{t('wordmark')}</span>
        <span className="text-muted-foreground text-[0.625rem] font-medium tracking-[0.22em] uppercase">
          {t('wordmarkTagline')}
        </span>
      </span>
    </span>
  );
}
