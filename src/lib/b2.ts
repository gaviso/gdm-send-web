import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const BUCKET = process.env.B2_BUCKET_NAME!;

export async function getUploadUrl(
  storagePath: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storagePath,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storagePath,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFile(storagePath: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
    })
  );
}

export async function deleteFiles(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;

  const batchSize = 1000;
  for (let i = 0; i < storagePaths.length; i += batchSize) {
    const batch = storagePaths.slice(i, i + batchSize);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
        },
      })
    );
  }
}
