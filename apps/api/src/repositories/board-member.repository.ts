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
