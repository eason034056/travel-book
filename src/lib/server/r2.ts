import crypto from "node:crypto";

import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Env } from "@/lib/server/env";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

function getClient() {
  const env = getR2Env();

  return {
    bucket: env.R2_BUCKET_NAME,
    client: new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    })
  };
}

export async function uploadTripPhoto(options: {
  tripId: string;
  originalFilename: string;
  body: Uint8Array;
  contentType: string;
}) {
  const { client, bucket } = getClient();
  const key = `trips/${options.tripId}/${crypto.randomUUID()}-${sanitizeFilename(options.originalFilename)}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: options.body,
      ContentType: options.contentType
    })
  );

  return key;
}

export async function signTripPhotoUrl(storageKey: string, expiresInSeconds = 300) {
  const { client, bucket } = getClient();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey
    }),
    {
      expiresIn: expiresInSeconds
    }
  );
}

export async function deleteTripStorageKeys(storageKeys: string[]) {
  const dedupedKeys = Array.from(new Set(storageKeys.filter(Boolean)));

  if (dedupedKeys.length === 0) {
    return;
  }

  const { client, bucket } = getClient();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: dedupedKeys.map((key) => ({ Key: key })),
        Quiet: true
      }
    })
  );
}
