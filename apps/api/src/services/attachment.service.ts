import type { Attachment, BoardRole, Card } from '@prisma/client';
import type { CreateAttachmentRequest, PresignAttachmentRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { createPresignedUpload, deleteObjectForFileUrl, isR2Configured } from '../lib/r2.js';
import { findCardById } from '../repositories/card.repository.js';
import {
  createAttachmentForCard,
  deleteAttachment as deleteAttachmentRow,
} from '../repositories/attachment.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { emitCardUpdated } from '../sockets/broadcast.js';
import { logActivity } from './activity-log.service.js';

// FR29 step 1: requireRole('MEMBER') on the route already excludes Viewers.
// Doesn't touch the DB at all — the Attachment row is only created once the
// client's direct PUT to R2 succeeds (createAttachment below).
export async function presignUpload(cardId: string, input: PresignAttachmentRequest) {
  if (!isR2Configured) {
    throw new HttpError(503, 'File storage is not configured in this environment');
  }
  return createPresignedUpload(cardId, input.mimeType);
}

// FR29 step 2: records the Attachment once the client's direct upload has
// already completed. fileSize is re-validated by createAttachmentRequestSchema
// at the route boundary (defense in depth — the presign step only validated
// the client's claimed size, not what was actually uploaded). When R2 is
// configured, fileUrl must live under our own public bucket base — otherwise
// any authenticated Member could record an arbitrary external URL as a
// "Card attachment". Skipped in dev when R2 is unconfigured, since there's
// no real prefix to validate against there anyway.
export async function createAttachment(
  card: Card,
  boardId: string,
  actorId: string,
  input: CreateAttachmentRequest,
) {
  if (isR2Configured && !input.fileUrl.startsWith(`${process.env.R2_PUBLIC_URL}/`)) {
    throw new HttpError(400, 'fileUrl must reference an object from this app\'s own file storage');
  }

  const uploader = await findUserById(actorId);
  await createAttachmentForCard(card.id, actorId, uploader!.name, input);
  await logActivity({
    boardId,
    cardId: card.id,
    actorId,
    type: 'attachment.added',
    metadata: { fileName: input.fileName },
  });

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

// Same author-or-admin authorization as comment.service.ts deleteComment —
// an attachment is content one person uploaded, not shared card metadata
// any Member can touch (unlike labels/assignees/dates/checklists).
export async function deleteAttachment(
  attachment: Attachment,
  card: Card,
  boardId: string,
  actorId: string,
  actorRole: BoardRole,
) {
  if (attachment.uploaderId !== actorId && actorRole !== 'ADMIN') {
    throw new HttpError(403, 'Only the uploader or a board admin can delete this attachment');
  }

  await deleteAttachmentRow(attachment.id);
  await logActivity({
    boardId,
    cardId: card.id,
    actorId,
    type: 'attachment.removed',
    metadata: { fileName: attachment.fileName },
  });
  // Best-effort — the DB row deletion (the source of truth for what the app
  // shows) has already committed either way; see r2.ts's comment.
  await deleteObjectForFileUrl(attachment.fileUrl).catch((error: unknown) => {
    console.error('Failed to delete R2 object for attachment', error);
  });

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}
