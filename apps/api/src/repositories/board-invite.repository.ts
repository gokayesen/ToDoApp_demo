import type { BoardRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export function createBoardInvite(input: {
  boardId: string;
  email: string;
  role: BoardRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.boardInvite.create({ data: input });
}

// Pending invites for an email: not yet accepted and not expired — resolved
// into BoardMember rows when that email completes registration.
export function findPendingBoardInvitesByEmail(email: string) {
  return prisma.boardInvite.findMany({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function markBoardInviteAccepted(id: string) {
  return prisma.boardInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
}
