import { prisma } from '../lib/prisma.js';

export function findBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
}
