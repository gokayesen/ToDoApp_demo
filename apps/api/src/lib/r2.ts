import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

// Architecture §3/§9: Cloudflare R2, S3-compatible, direct-to-storage
// presigned uploads — the API never proxies file bytes. Same guarded-
// configuration pattern as lib/email.ts (Resend) and passport.ts (Google
// OAuth): with no R2 credentials set (e.g. local dev), presign requests are
// rejected with a clean 503 instead of the process crashing at boot, so the
// rest of the API isn't held hostage by an unconfigured optional provider.
export const isR2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL,
);

const client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : undefined;

const PRESIGN_EXPIRY_SECONDS = 5 * 60;

// One key per attachment, prefixed by the owning Card so objects are at
// least loosely grouped in the bucket; the original fileName is preserved
// only in the Attachment DB row (Story 4.8), not the object key, since it
// may contain characters unsafe for a URL path segment.
export async function createPresignedUpload(
  cardId: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string }> {
  if (!client) throw new Error('R2 is not configured');

  const key = `cards/${cardId}/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
  const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, fileUrl };
}

// Best-effort: called from attachment.service.ts deleteAttachment after the
// DB row is already gone, same "swallow and log, never fail an already-
// committed mutation" rule sockets/broadcast.ts follows for socket emits. A
// no-op when R2 isn't configured (nothing was ever really stored) or the
// fileUrl doesn't live under our own public base (defensive, shouldn't
// happen since createAttachment validates fileUrl came from our own presign).
export async function deleteObjectForFileUrl(fileUrl: string): Promise<void> {
  if (!client) return;
  const base = `${process.env.R2_PUBLIC_URL}/`;
  if (!fileUrl.startsWith(base)) return;

  const key = fileUrl.slice(base.length);
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}
