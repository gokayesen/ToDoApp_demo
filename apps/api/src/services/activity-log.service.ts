import type { ActivityType } from '@todoapp/shared';

import { createActivityLogEntry } from '../repositories/activity-log.repository.js';
import { findUserById } from '../repositories/user.repository.js';

// Story 4.9 (FR30): single write path for every system-generated Activity
// Log entry, called from card.service.ts/checklist.service.ts/
// attachment.service.ts alongside their existing mutate -> reload -> emit
// steps. actorNameSnapshot is captured here (not resolved at read time) so
// the entry survives the actor's account being deleted later, same as
// Comment.authorNameSnapshot.
export async function logActivity(params: {
  boardId: string;
  cardId: string;
  actorId: string;
  type: ActivityType;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const actor = await findUserById(params.actorId);
  await createActivityLogEntry({
    boardId: params.boardId,
    cardId: params.cardId,
    userId: params.actorId,
    actorNameSnapshot: actor!.name,
    type: params.type,
    metadata: params.metadata,
  });
}
