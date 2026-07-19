import type { BoardRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export function findBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
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
