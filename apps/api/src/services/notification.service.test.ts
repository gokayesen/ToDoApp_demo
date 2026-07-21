import { afterEach, describe, expect, it } from 'vitest';

import { upsertPreference } from '../repositories/notification.repository.js';
import { prisma } from '../lib/prisma.js';
import { cleanupUser, createTestUser } from '../test-support/fixtures.js';
import { listNotifications, markAsRead, notifyUser } from './notification.service.js';

describe('notifyUser', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) await cleanupUser(userId);
  });

  it('creates an in-app row by default when no preference row exists', async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);

    await notifyUser(user.id, 'card.assigned', { message: 'You were assigned "Test Card"' });

    const notifications = await listNotifications(user.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe('card.assigned');
  });

  it('suppresses the in-app row when inAppEnabled is false, independent of emailEnabled', async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    await upsertPreference(user.id, 'card.assigned', { inAppEnabled: false, emailEnabled: true });

    await notifyUser(user.id, 'card.assigned', { message: 'You were assigned "Test Card"' });

    expect(await listNotifications(user.id)).toHaveLength(0);
  });

  it('still creates the in-app row when only emailEnabled is turned off', async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    await upsertPreference(user.id, 'card.assigned', { inAppEnabled: true, emailEnabled: false });

    await notifyUser(user.id, 'card.assigned', { message: 'You were assigned "Test Card"' });

    expect(await listNotifications(user.id)).toHaveLength(1);
  });

  it('markAsRead 404s when the notification belongs to a different user', async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    userIds.push(owner.id, stranger.id);

    await notifyUser(owner.id, 'card.assigned', { message: 'x' });
    const [notification] = await listNotifications(owner.id);

    await expect(markAsRead(notification!.id, stranger.id)).rejects.toMatchObject({ status: 404 });
    // Ownership is enforced, not just recorded — the row must stay unread.
    const stillUnread = await prisma.notification.findUniqueOrThrow({ where: { id: notification!.id } });
    expect(stillUnread.isRead).toBe(false);
  });
});
