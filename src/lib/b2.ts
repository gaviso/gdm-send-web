import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getIntegrationConfig } from "./integrations";

export interface B2Config {
  endpoint: string;
  region: string;
  bucket: string;
  keyId: string;
  appKey: string;
}

let clientCache: {
  client: S3Client;
  config: B2Config;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

async function loadConfig(): Promise<B2Config> {
  const db = await getIntegrationConfig("backblaze_b2");
  return {
    endpoint: db?.endpoint || process.env.B2_ENDPOINT || "",
    region: db?.region || process.env.B2_REGION || "",
    bucket: db?.bucket || process.env.B2_BUCKET_NAME || "",
    keyId: db?.key_id || process.env.B2_KEY_ID || "",
    appKey: db?.app_key || process.env.B2_APP_KEY || "",
  };
}

export async function getB2Client(): Promise<{
  client: S3Client;
  config: B2Config;
}> {
  if (clientCache && Date.now() < clientCache.expiresAt) {
    return { client: clientCache.client, config: clientCache.config };
  }
  const config = await loadConfig();
  if (!config.endpoint || !config.keyId || !config.appKey || !config.bucket) {
    throw new Error(
      "Backblaze B2 is not configured. Set it in admin > Integrations or via env vars."
    );
  }
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.appKey,
    },
  });
  clientCache = { client, config, expiresAt: Date.now() + CACHE_TTL_MS };
  return { client, config };
}

export function invalidateB2Cache() {
  clientCache = null;
}

export async function getUploadUrl(
  storagePath: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const { client, config } = await getB2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storagePath,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function getDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { client, config } = await getB2Client();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: storagePath,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFile(storagePath: string): Promise<void> {
  const { client, config } = await getB2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storagePath,
    })
  );
}

export async function deleteFiles(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const { client, config } = await getB2Client();

  const batchSize = 1000;
  for (let i = 0; i < storagePaths.length; i += batchSize) {
    const batch = storagePaths.slice(i, i + batchSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
        },
      })
    );
  }
}
