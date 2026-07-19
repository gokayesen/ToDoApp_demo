import type {
  Board,
  Card,
  CreateCardRequest,
  CreateListRequest,
  List,
  MoveListRequest,
} from '@todoapp/shared';

import { apiFetch } from './api-client';

export function getBoard(boardId: string) {
  return apiFetch<Board>(`/boards/${boardId}`);
}

export function listLists(boardId: string) {
  return apiFetch<List[]>(`/boards/${boardId}/lists`);
}

export function createList(boardId: string, input: CreateListRequest) {
  return apiFetch<List>(`/boards/${boardId}/lists`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function moveList(listId: string, input: MoveListRequest) {
  return apiFetch<List>(`/lists/${listId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listCards(listId: string) {
  return apiFetch<Card[]>(`/lists/${listId}/cards`);
}

export function createCard(listId: string, input: CreateCardRequest) {
  return apiFetch<Card>(`/lists/${listId}/cards`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
