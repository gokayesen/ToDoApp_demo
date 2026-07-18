import { prisma } from '../lib/prisma.js';

export function createWorkspaceInvite(input: {
  workspaceId: string;
  email: string;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.workspaceInvite.create({ data: input });
}

// Pending invites for an email: not yet accepted and not expired — resolved
// into WorkspaceMember rows when that email completes registration.
export function findPendingWorkspaceInvitesByEmail(email: string) {
  return prisma.workspaceInvite.findMany({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function markWorkspaceInviteAccepted(id: string) {
  return prisma.workspaceInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
}
