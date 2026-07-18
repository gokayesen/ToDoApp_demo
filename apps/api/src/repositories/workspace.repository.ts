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
