import { prisma } from '../lib/prisma.js';

export function findWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export function addWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.create({
    data: { workspaceId, userId, role: 'MEMBER' },
  });
}
