import crypto from "node:crypto";

import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Env } from "@/lib/server/env";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

function buildTripPhotoStorageKey(tripId: string, originalFilename: string) {
  return `trips/${tripId}/${crypto.randomUUID()}-${sanitizeFilename(originalFilename)}`;
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
  const key = buildTripPhotoStorageKey(options.tripId, options.originalFilename);

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

export async function createTripPhotoUploadTarget(options: {
  tripId: string;
  originalFilename: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const { client, bucket } = getClient();
  const storageKey = buildTripPhotoStorageKey(options.tripId, options.originalFilename);

  return {
    contentType: options.contentType,
    originalFilename: options.originalFilename,
    photoId: `${options.originalFilename}-${crypto.randomUUID()}`,
    storageKey,
    uploadUrl: await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        ContentType: options.contentType,
        Key: storageKey
      }),
      {
        expiresIn: options.expiresInSeconds ?? 300
      }
    )
  };
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
