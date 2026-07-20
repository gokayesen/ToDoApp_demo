import type { BoardRole, Card, Comment } from '@prisma/client';
import type { CreateCommentRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { findCardById } from '../repositories/card.repository.js';
import {
  createCommentForCard,
  deleteComment as deleteCommentRow,
} from '../repositories/comment.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { emitCardUpdated } from '../sockets/broadcast.js';

// FR28: requireRole('MEMBER') on the route already excludes Viewers.
// authorNameSnapshot is captured at creation time (Architecture §4 cascade
// table) so the comment survives its author's account being deleted later —
// denormalized here rather than resolved at read time. @mentions are a
// plain-text `@Full Name` convention the client renders/highlights against
// the current Board Members list (see schema.prisma's Comment model
// comment) — no Notification wiring, since Notification doesn't exist until
// Epic 6.
export async function createComment(card: Card, boardId: string, actorId: string, input: CreateCommentRequest) {
  const author = await findUserById(actorId);
  await createCommentForCard(card.id, actorId, author!.name, input.body);

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

// Only the comment's own author or a Board Admin may delete it — unlike
// every other Card-content mutation (labels, assignees, dates, checklists),
// which any Member can touch regardless of who created it, a comment is a
// personal statement rather than shared card metadata.
export async function deleteComment(
  comment: Comment,
  card: Card,
  boardId: string,
  actorId: string,
  actorRole: BoardRole,
) {
  if (comment.userId !== actorId && actorRole !== 'ADMIN') {
    throw new HttpError(403, 'Only the comment author or a board admin can delete this comment');
  }

  await deleteCommentRow(comment.id);

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}
