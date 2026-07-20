import type { BoardRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export function findBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
}

// Story 4.5 (FR26): powers the Card assignee picker. Scoped to explicit
// BoardMember rows only, same set Story 2.5/2.6 already operate on — see
// packages/shared's boardMemberSchema comment for why the Workspace Owner's
// implicit access doesn't appear here.
export function listBoardMembers(boardId: string) {
  return prisma.boardMember.findMany({
    where: { boardId },
    include: { user: true },
    orderBy: { user: { name: 'asc' } },
  });
}

export function addBoardMember(boardId: string, userId: string, role: BoardRole) {
  return prisma.boardMember.create({ data: { boardId, userId, role } });
}

export function updateBoardMemberRole(boardId: string, userId: string, role: BoardRole) {
  return prisma.boardMember.update({
    where: { boardId_userId: { boardId, userId } },
    data: { role },
  });
}

export function removeBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
}
