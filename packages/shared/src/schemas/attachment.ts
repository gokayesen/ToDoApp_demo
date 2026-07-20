import { z } from 'zod';

// FR29 / PRD §9 assumption #3 (documented, not yet confirmed by the user —
// see sprint-status.yaml open_items_before_first_standup). Kept private to
// this module rather than exported: a 'use client' component importing any
// value export from packages/shared's schemas has previously broken Next's
// bundler resolution of unrelated sibling exports (see label.ts's comment on
// the Story 4.3 barrel-file bug) — the frontend duplicates this number as a
// plain literal instead of importing it.
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  uploaderId: z.string().uuid().nullable(),
  uploaderNameSnapshot: z.string(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  createdAt: z.coerce.date(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Step 1 of the direct-to-R2 upload flow (Architecture §3/§9): the client
// asks for a presigned PUT URL before it has actually uploaded anything, so
// size/type are validated against the request metadata, not the file bytes.
export const presignAttachmentRequestSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
  mimeType: z.string().min(1),
});

export type PresignAttachmentRequest = z.infer<typeof presignAttachmentRequestSchema>;

export const presignAttachmentResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileUrl: z.string().url(),
});

export type PresignAttachmentResponse = z.infer<typeof presignAttachmentResponseSchema>;

// Step 2: after the client's direct PUT to `uploadUrl` succeeds, it records
// the resulting Attachment row via this request — fileSize is re-validated
// server-side here too (defense in depth, never trust the client twice).
export const createAttachmentRequestSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
  mimeType: z.string().min(1),
});

export type CreateAttachmentRequest = z.infer<typeof createAttachmentRequestSchema>;
