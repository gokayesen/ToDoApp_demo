import { z } from 'zod';

// Story 5.2: shape of a single board's live presence list, broadcast as
// `presence:update` after every board:join/board:leave/disconnect
// (Architecture §6). Shared so the API's broadcast payload and the web
// client's socket listener can't drift.
export const presenceMemberSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export type PresenceMember = z.infer<typeof presenceMemberSchema>;

export const presenceUpdateSchema = z.object({
  boardId: z.string().uuid(),
  members: z.array(presenceMemberSchema),
});

export type PresenceUpdate = z.infer<typeof presenceUpdateSchema>;

export const boardAccessRevokedSchema = z.object({
  boardId: z.string().uuid(),
});

export type BoardAccessRevoked = z.infer<typeof boardAccessRevokedSchema>;
