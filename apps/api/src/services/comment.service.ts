import type { BoardMember, BoardRole, Card, Comment, User } from '@prisma/client';
import type { CreateCommentRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { findCardById } from '../repositories/card.repository.js';
import { listBoardMembers } from '../repositories/board-member.repository.js';
import {
  createCommentForCard,
  deleteComment as deleteCommentRow,
} from '../repositories/comment.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { emitCardUpdated } from '../sockets/broadcast.js';
import { notifyUser } from './notification.service.js';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Same "longest name first, so a short name doesn't shadow inside a longer
// one" regex convention as the client's own re-highlighting logic
// (comment-section.tsx renderBody) — kept independent rather than shared
// since one runs against Prisma rows and the other against the API's
// BoardMember DTO.
function parseMentionedUserIds(body: string, members: (BoardMember & { user: User })[]): string[] {
  if (members.length === 0) return [];
  const sorted = [...members].sort((a, b) => b.user.name.length - a.user.name.length);
  const pattern = new RegExp(`@(${sorted.map((m) => escapeRegExp(m.user.name)).join('|')})`, 'g');

  const matched = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const member = sorted.find((m) => m.user.name === match![1]);
    if (member) matched.add(member.userId);
  }
  return [...matched];
}

// FR28: requireRole('MEMBER') on the route already excludes Viewers.
// authorNameSnapshot is captured at creation time (Architecture §4 cascade
// table) so the comment survives its author's account being deleted later —
// denormalized here rather than resolved at read time. @mentions are a
// plain-text `@Full Name` convention the client renders/highlights against
// the current Board Members list (see schema.prisma's Comment model
// comment); FR34 (Story 6.3) notifies whichever of those Members were
// actually matched, excluding a self-mention.
export async function createComment(card: Card, boardId: string, actorId: string, input: CreateCommentRequest) {
  const author = await findUserById(actorId);
  await createCommentForCard(card.id, actorId, author!.name, input.body);

  const members = await listBoardMembers(boardId);
  const mentionedUserIds = parseMentionedUserIds(input.body, members).filter((id) => id !== actorId);
  for (const userId of mentionedUserIds) {
    await notifyUser(userId, 'comment.mention', {
      message: `${author!.name} mentioned you in a comment`,
      boardId,
    });
  }

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
