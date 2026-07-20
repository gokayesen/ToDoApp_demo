import { prisma } from '../lib/prisma.js';

export function findAttachmentById(id: string) {
  return prisma.attachment.findUnique({ where: { id } });
}

export function createAttachmentForCard(
  cardId: string,
  uploaderId: string,
  uploaderNameSnapshot: string,
  data: { fileUrl: string; fileName: string; fileSize: number; mimeType: string },
) {
  return prisma.attachment.create({ data: { cardId, uploaderId, uploaderNameSnapshot, ...data } });
}

export function deleteAttachment(id: string) {
  return prisma.attachment.delete({ where: { id } });
}
