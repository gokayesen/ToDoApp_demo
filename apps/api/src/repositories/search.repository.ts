import { prisma } from '../lib/prisma.js';

const SEARCH_RESULT_LIMIT = 30;

// FR37: cross-board keyword search. A Board counts as accessible under the
// exact same rule board-role.service.ts's resolveBoardRole applies per-board
// (implicit ADMIN via the owning Workspace's OWNER, or an explicit
// BoardMember row) — here expressed as a set membership since this query
// spans every Board the user can reach at once, not just one.
export function searchCardsForUser(userId: string, query: string) {
  return prisma.card.findMany({
    where: {
      isArchived: false,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      list: {
        isArchived: false,
        board: {
          isArchived: false,
          OR: [
            { workspace: { members: { some: { userId, role: 'OWNER' } } } },
            { members: { some: { userId } } },
          ],
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: SEARCH_RESULT_LIMIT,
    include: {
      list: {
        select: {
          id: true,
          name: true,
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
              workspace: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}
