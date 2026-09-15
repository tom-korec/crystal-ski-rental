import { cn } from '~/lib/utils';

interface AccountAvatarProps {
  name: string;
  className?: string;
}

/** The account's initials in a circle. Decorative: the name is always written next to it. */
export function AccountAvatar({ name, className }: AccountAvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary text-primary-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        className,
      )}
    >
      {initials}
    </span>
  );
}
