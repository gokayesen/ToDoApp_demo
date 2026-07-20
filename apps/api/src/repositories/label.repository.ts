import { prisma } from '../lib/prisma.js';

export function findLabelById(id: string) {
  return prisma.label.findUnique({ where: { id } });
}

export function listLabelsForBoard(boardId: string) {
  return prisma.label.findMany({ where: { boardId }, orderBy: { name: 'asc' } });
}

export function createLabelForBoard(boardId: string, name: string, color: string) {
  return prisma.label.create({ data: { boardId, name, color } });
}

export function updateLabelFields(id: string, data: { name?: string; color?: string }) {
  return prisma.label.update({ where: { id }, data });
}

export function deleteLabel(id: string) {
  return prisma.label.delete({ where: { id } });
}
