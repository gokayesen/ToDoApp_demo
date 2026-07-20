import { prisma } from '../lib/prisma.js';

export function findCommentById(id: string) {
  return prisma.comment.findUnique({ where: { id } });
}

export function createCommentForCard(
  cardId: string,
  userId: string,
  authorNameSnapshot: string,
  body: string,
) {
  return prisma.comment.create({ data: { cardId, userId, authorNameSnapshot, body } });
}

export function deleteComment(id: string) {
  return prisma.comment.delete({ where: { id } });
}
