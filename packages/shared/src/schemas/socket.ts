import { z } from 'zod';

import { cardSchema } from './card.js';
import { listSchema } from './list.js';

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

// Story 5.3: broadcast to the board room after every List/Card mutation
// commits (Architecture §6 event catalog). Payloads carry the full updated
// entity — not just the changed field(s) — so a client cache merge (Story
// 5.4) can upsert by id without a follow-up REST call. `moved` carries
// `movedBy`, matching the architecture's `card:moved {..., movedBy}`
// example — knowing who moved something is what lets the mover's own
// client skip re-animating its own optimistic update. `created` carries
// `actorId` too (added for Story 5.7's out-of-view toast: "X added a card
// to Y" needs to know who X is); `updated`/`deleted` still don't, since
// nothing consumes an actor for those yet.
export const listCreatedEventSchema = z.object({ list: listSchema, actorId: z.string().uuid() });
export type ListCreatedEvent = z.infer<typeof listCreatedEventSchema>;

export const listUpdatedEventSchema = z.object({ list: listSchema });
export type ListUpdatedEvent = z.infer<typeof listUpdatedEventSchema>;

export const listMovedEventSchema = z.object({ list: listSchema, movedBy: z.string().uuid() });
export type ListMovedEvent = z.infer<typeof listMovedEventSchema>;

export const listDeletedEventSchema = z.object({
  listId: z.string().uuid(),
  boardId: z.string().uuid(),
});
export type ListDeletedEvent = z.infer<typeof listDeletedEventSchema>;

export const cardCreatedEventSchema = z.object({ card: cardSchema, actorId: z.string().uuid() });
export type CardCreatedEvent = z.infer<typeof cardCreatedEventSchema>;

export const cardUpdatedEventSchema = z.object({ card: cardSchema });
export type CardUpdatedEvent = z.infer<typeof cardUpdatedEventSchema>;

export const cardMovedEventSchema = z.object({ card: cardSchema, movedBy: z.string().uuid() });
export type CardMovedEvent = z.infer<typeof cardMovedEventSchema>;

export const cardDeletedEventSchema = z.object({
  cardId: z.string().uuid(),
  listId: z.string().uuid(),
  boardId: z.string().uuid(),
});
export type CardDeletedEvent = z.infer<typeof cardDeletedEventSchema>;
