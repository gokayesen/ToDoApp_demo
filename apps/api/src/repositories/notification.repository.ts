import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

// Story 6.3 (FR34): `payload` follows the { message, boardId? } contract
// Story 6.2's NotificationCenter reads — `type` stays a plain string (no
// producer existed to justify an enum back in Story 6.1).
export function createNotification(userId: string, type: string, payload: Record<string, unknown>) {
  return prisma.notification.create({
    data: { userId, type, payload: payload as Prisma.InputJsonValue },
  });
}

export function findNotificationsByUser(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export function findNotificationById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

export function markNotificationRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export function findPreferencesByUser(userId: string) {
  return prisma.notificationPreference.findMany({ where: { userId } });
}

export function findPreference(userId: string, eventType: string) {
  return prisma.notificationPreference.findUnique({
    where: { userId_eventType: { userId, eventType } },
  });
}

export function upsertPreference(
  userId: string,
  eventType: string,
  input: { emailEnabled?: boolean; inAppEnabled?: boolean },
) {
  return prisma.notificationPreference.upsert({
    where: { userId_eventType: { userId, eventType } },
    create: {
      userId,
      eventType,
      emailEnabled: input.emailEnabled ?? true,
      inAppEnabled: input.inAppEnabled ?? true,
    },
    update: input,
  });
}
