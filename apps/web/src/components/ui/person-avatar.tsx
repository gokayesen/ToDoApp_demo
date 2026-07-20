import { cn } from '@/lib/utils';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

// Shared circular avatar (image or initials fallback) — used by presence
// (board header live-viewer stack) and Card assignees (board face + Card
// Detail), so both stacks render the same visual language.
export function PersonAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <div
      title={name}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[0.65rem] font-medium text-primary-foreground ring-2 ring-background',
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote avatar, no next/image config for arbitrary hosts
        <img src={avatarUrl} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

// Overlapping avatar stack with a "+N" overflow badge — shared by board
// presence (PresenceAvatars) and Card assignees (card-item.tsx face preview,
// UX §4.2 "assignee avatar stack, max 3 shown + overflow count").
export function AvatarStack<T extends { name: string; avatarUrl: string | null }>({
  people,
  keyOf,
  max = 5,
  size,
}: {
  people: T[];
  keyOf: (person: T) => string;
  max?: number;
  size?: 'sm' | 'md';
}) {
  if (people.length === 0) return null;

  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const avatarClassName = size === 'sm' ? 'size-5 text-[0.55rem]' : undefined;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person) => (
        <PersonAvatar
          key={keyOf(person)}
          name={person.name}
          avatarUrl={person.avatarUrl}
          className={avatarClassName}
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-background',
            size === 'sm' ? 'size-5 text-[0.55rem]' : 'size-7 text-[0.65rem]',
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
