import { useTranslations } from 'next-intl';

import { Badge } from '~/components/ui/badge';
import type { SkiGender, SkillLevel, SkiType } from '~/lib/catalog';

interface SkiBadgesProps {
  type: SkiType;
  gender: SkiGender;
  skillLevel: SkillLevel;
}

export function SkiBadges({ type, gender, skillLevel }: SkiBadgesProps) {
  const t = useTranslations('catalog');

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{t(`type.${type}`)}</Badge>
      <Badge variant="secondary">{t(`gender.${gender}`)}</Badge>
      <Badge variant="secondary">{t(`level.${skillLevel}`)}</Badge>
    </div>
  );
}
