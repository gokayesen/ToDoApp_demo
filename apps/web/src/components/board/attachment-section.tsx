'use client';

import type { Attachment, Card } from '@todoapp/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useRef, useState } from 'react';

import { createAttachment, deleteAttachment, presignAttachment } from '@/lib/board-api';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

// FR29 / PRD §9 assumption #3 (documented, unconfirmed default). Not
// imported from packages/shared's attachmentSchema module — a 'use client'
// component importing any value export from that package has previously
// broken Next's bundler resolution of unrelated sibling exports (Story 4.3's
// barrel-file bug), so this is duplicated here as a plain literal, same
// convention as label-colors.ts.
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Story 4.8 (FR29): direct-to-R2 upload (Architecture §3/§9) — this
// component never sends file bytes through our own API. It asks for a
// presigned PUT URL, uploads straight to R2 with that URL, then records the
// result as an Attachment. In an environment with no R2 credentials
// configured (e.g. local dev), the presign step 503s with a clear message
// rather than the upload silently going nowhere.
export function AttachmentSection({ card, listId }: { card: Card; listId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function patchCard(updated: Card) {
    queryClient.setQueryData(['cards', listId], (old: Card[] | undefined) =>
      old?.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: patchCard,
  });

  async function handleFileSelected(file: File) {
    setError(null);
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setError('File is larger than the 10MB limit.');
      return;
    }

    const mimeType = file.type || 'application/octet-stream';
    setUploading(true);
    try {
      const { uploadUrl, fileUrl } = await presignAttachment(card.id, {
        fileName: file.name,
        fileSize: file.size,
        mimeType,
      });

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });
      if (!putResponse.ok) throw new Error('Upload to storage failed');

      const updated = await createAttachment(card.id, {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
      });
      patchCard(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {card.attachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {card.attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              canDelete={attachment.uploaderId === user?.id}
              onDelete={() => deleteMutation.mutate(attachment.id)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so selecting the same file again after an error still fires onChange.
          e.target.value = '';
          if (file) void handleFileSelected(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <PlusIcon /> {uploading ? 'Uploading…' : 'Add attachment'}
      </Button>
    </div>
  );
}

function AttachmentRow({
  attachment,
  canDelete,
  onDelete,
}: {
  attachment: Attachment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <div className="group flex items-center gap-2 rounded-md border border-border p-1.5">
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote R2 URL, no next/image host config
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="size-10 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
            <FileIcon className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{attachment.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.fileSize)} · {attachment.uploaderNameSnapshot}
          </p>
        </div>
      </a>
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete attachment ${attachment.fileName}`}
          onClick={onDelete}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
