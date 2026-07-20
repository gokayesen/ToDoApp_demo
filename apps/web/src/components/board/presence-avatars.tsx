import type { PresenceMember } from '@todoapp/shared';

import { cn } from '@/lib/utils';

const MAX_VISIBLE = 5;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function PresenceAvatar({ member, className }: { member: PresenceMember; className?: string }) {
  return (
    <div
      title={member.name}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[0.65rem] font-medium text-primary-foreground ring-2 ring-background',
        className,
      )}
    >
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote avatar, no next/image config for arbitrary hosts
        <img src={member.avatarUrl} alt={member.name} className="size-full object-cover" />
      ) : (
        initials(member.name)
      )}
    </div>
  );
}

// UX §4.2/§6: "avatar stack of members currently viewing the board" in the
// board header's right side, updating live as people join/leave (NFR2).
export function PresenceAvatars({ members }: { members: PresenceMember[] }) {
  if (members.length === 0) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <PresenceAvatar key={member.userId} member={member} />
      ))}
      {overflow > 0 && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] font-medium text-muted-foreground ring-2 ring-background">
          +{overflow}
        </div>
      )}
    </div>
  );
}
