import type {
  AttachCardLabelRequest,
  Board,
  Card,
  CreateCardRequest,
  CreateLabelRequest,
  CreateListRequest,
  Label,
  List,
  MoveCardRequest,
  MoveListRequest,
  UpdateCardRequest,
  UpdateLabelRequest,
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

export function archiveList(listId: string) {
  return apiFetch<List>(`/lists/${listId}/archive`, { method: 'POST' });
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

export function moveCard(cardId: string, input: MoveCardRequest) {
  return apiFetch<Card>(`/cards/${cardId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCard(cardId: string, input: UpdateCardRequest) {
  return apiFetch<Card>(`/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listLabels(boardId: string) {
  return apiFetch<Label[]>(`/boards/${boardId}/labels`);
}

export function createLabel(boardId: string, input: CreateLabelRequest) {
  return apiFetch<Label>(`/boards/${boardId}/labels`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateLabel(labelId: string, input: UpdateLabelRequest) {
  return apiFetch<Label>(`/labels/${labelId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteLabel(labelId: string) {
  return apiFetch<void>(`/labels/${labelId}`, { method: 'DELETE' });
}

export function attachCardLabel(cardId: string, input: AttachCardLabelRequest) {
  return apiFetch<Card>(`/cards/${cardId}/labels`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function detachCardLabel(cardId: string, labelId: string) {
  return apiFetch<Card>(`/cards/${cardId}/labels/${labelId}`, { method: 'DELETE' });
}
