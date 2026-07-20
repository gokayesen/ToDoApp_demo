import { prisma } from '../lib/prisma.js';

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
