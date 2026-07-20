import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export function createActivityLogEntry(data: {
  boardId: string;
  cardId: string;
  userId: string;
  actorNameSnapshot: string;
  type: string;
  metadata: Record<string, unknown>;
}) {
  return prisma.activityLog.create({ data: { ...data, metadata: data.metadata as Prisma.InputJsonValue } });
}
