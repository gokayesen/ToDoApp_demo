import type {
  AssignCardRequest,
  AttachCardLabelRequest,
  Board,
  BoardMember,
  Card,
  CreateAttachmentRequest,
  CreateCardRequest,
  CreateChecklistItemRequest,
  CreateChecklistRequest,
  CreateCommentRequest,
  CreateLabelRequest,
  CreateListRequest,
  Label,
  List,
  MoveCardRequest,
  MoveChecklistItemRequest,
  MoveListRequest,
  PresignAttachmentRequest,
  PresignAttachmentResponse,
  UpdateCardRequest,
  UpdateChecklistItemRequest,
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

export function listBoardMembers(boardId: string) {
  return apiFetch<BoardMember[]>(`/boards/${boardId}/members`);
}

export function assignCard(cardId: string, input: AssignCardRequest) {
  return apiFetch<Card>(`/cards/${cardId}/assignees`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function unassignCard(cardId: string, userId: string) {
  return apiFetch<Card>(`/cards/${cardId}/assignees/${userId}`, { method: 'DELETE' });
}

export function createChecklist(cardId: string, input: CreateChecklistRequest) {
  return apiFetch<Card>(`/cards/${cardId}/checklists`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteChecklist(checklistId: string) {
  return apiFetch<Card>(`/checklists/${checklistId}`, { method: 'DELETE' });
}

export function createChecklistItem(checklistId: string, input: CreateChecklistItemRequest) {
  return apiFetch<Card>(`/checklists/${checklistId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateChecklistItem(itemId: string, input: UpdateChecklistItemRequest) {
  return apiFetch<Card>(`/checklist-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteChecklistItem(itemId: string) {
  return apiFetch<Card>(`/checklist-items/${itemId}`, { method: 'DELETE' });
}

export function moveChecklistItem(itemId: string, input: MoveChecklistItemRequest) {
  return apiFetch<Card>(`/checklist-items/${itemId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createComment(cardId: string, input: CreateCommentRequest) {
  return apiFetch<Card>(`/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteComment(commentId: string) {
  return apiFetch<Card>(`/comments/${commentId}`, { method: 'DELETE' });
}

export function presignAttachment(cardId: string, input: PresignAttachmentRequest) {
  return apiFetch<PresignAttachmentResponse>(`/cards/${cardId}/attachments/presign`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createAttachment(cardId: string, input: CreateAttachmentRequest) {
  return apiFetch<Card>(`/cards/${cardId}/attachments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteAttachment(attachmentId: string) {
  return apiFetch<Card>(`/attachments/${attachmentId}`, { method: 'DELETE' });
}
