import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { signAccessToken } from '../lib/jwt.js';
import {
  cleanupUser,
  cleanupWorkspace,
  createTestBoard,
  createTestUser,
  createTestWorkspaceWithOwner,
} from '../test-support/fixtures.js';

describe('GET /boards/:boardId RBAC', () => {
  const app = createApp();
  const cleanup: { userIds: string[]; workspaceIds: string[] } = { userIds: [], workspaceIds: [] };

  afterEach(async () => {
    for (const workspaceId of cleanup.workspaceIds.splice(0)) await cleanupWorkspace(workspaceId);
    for (const userId of cleanup.userIds.splice(0)) await cleanupUser(userId);
  });

  it('401s with no access token', async () => {
    const res = await request(app).get('/boards/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('404s for a nonexistent board even with a valid token', async () => {
    const { user } = await createTestUser();
    cleanup.userIds.push(user.id);
    const token = signAccessToken(user.id);

    const res = await request(app)
      .get('/boards/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("403s a real board the caller has no membership on, 200s the Workspace Owner's implicit access", async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id, stranger.id);

    const strangerRes = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', `Bearer ${signAccessToken(stranger.id)}`);
    expect(strangerRes.status).toBe(403);

    const ownerRes = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', `Bearer ${signAccessToken(owner.id)}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.id).toBe(board.id);
  });
});
