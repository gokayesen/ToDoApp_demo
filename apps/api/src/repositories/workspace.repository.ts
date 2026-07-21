import { prisma } from '../lib/prisma.js';

export function findWorkspaceById(id: string) {
  return prisma.workspace.findUnique({ where: { id } });
}

export function createWorkspaceWithOwner(name: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name, ownerId } });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: 'OWNER' },
    });
    return workspace;
  });
}

export function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { name: 'asc' },
  });
}

// Story 8.8 (FR40): every Workspace this user owns, with its OTHER members
// (the owner's own WorkspaceMember row excluded) — this is exactly the set
// account deletion needs to resolve per Architecture §4's Workspace.ownerId
// Restrict rule, either via an ownership transfer (otherMembers non-empty) or
// an outright Workspace delete (no one else to transfer to).
export function listOwnedWorkspacesWithOtherMembers(ownerId: string) {
  return prisma.workspace.findMany({
    where: { ownerId },
    include: {
      members: { where: { userId: { not: ownerId } }, include: { user: true } },
    },
  });
}
