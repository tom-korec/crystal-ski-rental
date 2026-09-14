import { useTranslations } from 'next-intl';

import { Badge } from '~/components/ui/badge';
import type { Role } from '~/lib/roles';

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const t = useTranslations('roles');

  return (
    <Badge variant={role === 'USER' ? 'outline' : 'secondary'} data-testid="role-badge">
      {t(role)}
    </Badge>
  );
}
