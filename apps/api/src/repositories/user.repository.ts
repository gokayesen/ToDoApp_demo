import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(input: {
  email: string;
  name: string;
  passwordHash?: string;
  avatarUrl?: string;
}) {
  return prisma.user.create({ data: input });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function updateUserProfile(id: string, input: { name?: string; avatarUrl?: string | null }) {
  return prisma.user.update({ where: { id }, data: input });
}

// Story 8.8 (FR40): user.service.ts deleteAccount has already validated, per
// owned Workspace, whether it transfers (otherMembers existed) or deletes
// (none did) — this just executes both in one transaction and then the User
// row itself, in that order, so Workspace.ownerId's Restrict (Architecture §4)
// never sees a dangling reference to the User being deleted. Every other
// relation (WorkspaceMember/BoardMember/CardAssignee Cascade,
// RefreshToken/PasswordResetToken/NotificationPreference Cascade,
// Comment/Attachment/ActivityLog SetNull with a name snapshot already
// captured at creation) is already schema-level and needs no code here.
export async function deleteUserAndTransferWorkspaces(
  userId: string,
  transfers: { workspaceId: string; newOwnerId: string }[],
  workspaceIdsToDelete: string[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const { workspaceId, newOwnerId } of transfers) {
      await tx.workspace.update({ where: { id: workspaceId }, data: { ownerId: newOwnerId } });
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
        data: { role: 'OWNER' },
      });
    }
    for (const workspaceId of workspaceIdsToDelete) {
      await tx.workspace.delete({ where: { id: workspaceId } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
}
