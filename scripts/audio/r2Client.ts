// Thin wrapper around Cloudflare R2's S3-compatible API for uploading audio
// clips. R2 (not Convex file storage) is where audioClips.url points — static,
// immutable, CDN-served assets fit an object store better than a database's
// file API, and R2 has zero egress fees. See convex/schema.ts's audioClips
// table comment for the full rationale.
//
// Credentials come from process.env.R2_* (gitignored .env.local), read lazily
// so importing this module never requires them to exist.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

class R2ConfigError extends Error {
  constructor(missingVar: string) {
    super(`${missingVar} is not set. R2 upload requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL in .env.local.`);
    this.name = "R2ConfigError";
  }
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId) throw new R2ConfigError("R2_ACCOUNT_ID");
  if (!accessKeyId) throw new R2ConfigError("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new R2ConfigError("R2_SECRET_ACCESS_KEY");
  if (!bucket) throw new R2ConfigError("R2_BUCKET_NAME");
  if (!publicUrl) throw new R2ConfigError("R2_PUBLIC_URL");

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

/**
 * Uploads `audio` to R2 at `key` and returns its public URL
 * (`${R2_PUBLIC_URL}/${key}`). Overwrites if the key already exists —
 * regenerating a clip for the same key is a deliberate re-synthesis, not
 * an error.
 */
export async function uploadClip(key: string, audio: Buffer): Promise<string> {
  const { bucket, publicUrl } = getR2Config();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: audio,
      ContentType: "audio/mpeg",
    }),
  );
  return `${publicUrl}/${key}`;
}
