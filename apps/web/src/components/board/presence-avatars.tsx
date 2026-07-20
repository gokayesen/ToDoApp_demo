import type { PresenceMember } from '@todoapp/shared';

import { AvatarStack } from '@/components/ui/person-avatar';

const MAX_VISIBLE = 5;

// UX §4.2/§6: "avatar stack of members currently viewing the board" in the
// board header's right side, updating live as people join/leave (NFR2).
export function PresenceAvatars({ members }: { members: PresenceMember[] }) {
  return <AvatarStack people={members} keyOf={(member) => member.userId} max={MAX_VISIBLE} />;
}
