import type { Card, List } from '@prisma/client';

import { boardRoom, getIO } from './gateway.js';

// Story 5.3 / Architecture §6 event catalog: every List/Card mutation
// broadcasts to the board room right after its DB commit resolves. Swallow
// and log rather than throw — a broadcast failing (e.g. gateway not up yet)
// must never fail a REST response for a mutation that already committed
// successfully, same rule sockets/board-access.ts follows for eviction.
function emit(boardId: string, event: string, payload: unknown): void {
  try {
    getIO().to(boardRoom(boardId)).emit(event, payload);
  } catch (error) {
    console.error(`Failed to broadcast ${event}`, error);
  }
}

export function emitListCreated(boardId: string, list: List, actorId: string): void {
  emit(boardId, 'list:created', { list, actorId });
}

export function emitListUpdated(boardId: string, list: List): void {
  emit(boardId, 'list:updated', { list });
}

export function emitListMoved(boardId: string, list: List, movedBy: string): void {
  emit(boardId, 'list:moved', { list, movedBy });
}

export function emitListDeleted(boardId: string, listId: string): void {
  emit(boardId, 'list:deleted', { listId, boardId });
}

export function emitCardCreated(boardId: string, card: Card, actorId: string): void {
  emit(boardId, 'card:created', { card, actorId });
}

export function emitCardUpdated(boardId: string, card: Card): void {
  emit(boardId, 'card:updated', { card });
}

export function emitCardMoved(boardId: string, card: Card, movedBy: string): void {
  emit(boardId, 'card:moved', { card, movedBy });
}

export function emitCardDeleted(boardId: string, cardId: string, listId: string): void {
  emit(boardId, 'card:deleted', { cardId, listId, boardId });
}
