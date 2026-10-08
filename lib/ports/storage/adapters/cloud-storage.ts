import { Storage } from "@google-cloud/storage";
import { attachmentDisposition } from "../attachment";
import { assertSafeKey, type FileStorage, type StoredFile } from "../types";

/*
 * Files in a private Cloud Storage bucket. Google signs the URLs; the browser downloads straight
 * from Google. The bucket uses uniform access and no object is public.
 */

/** The part of a bucket this adapter uses, so tests can stand in for Google. */
export type BucketClient = {
  save: (key: string, body: Uint8Array, contentType: string) => Promise<void>;
  load: (key: string) => Promise<StoredFile | null>;
  delete: (key: string) => Promise<void>;
  sign: (key: string, expires: Date, disposition: string) => Promise<string>;
};

type Credentials = { project_id: string; client_email: string; private_key: string };

export function googleBucket(
  credentials: Credentials,
  projectId: string,
  bucketName: string,
): BucketClient {
  const bucket = new Storage({
    projectId,
    credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
  }).bucket(bucketName);
  return {
    save: (key, body, contentType) =>
      bucket.file(key).save(Buffer.from(body), { contentType, resumable: false }),
    load: async (key) => {
      const file = bucket.file(key);
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      const [[body], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      return {
        body: new Uint8Array(body),
        contentType: metadata.contentType ?? "application/octet-stream",
      };
    },
    delete: async (key) => {
      await bucket.file(key).delete({ ignoreNotFound: true });
    },
    sign: async (key, expires, disposition) => {
      const [url] = await bucket
        .file(key)
        .getSignedUrl({ version: "v4", action: "read", expires, responseDisposition: disposition });
      return url;
    },
  };
}

const MILLISECONDS = 1000;

export function createCloudStorage(
  bucket: BucketClient,
  now: () => number = Date.now,
): FileStorage {
  return {
    async put(key, file: StoredFile) {
      assertSafeKey(key);
      await bucket.save(key, file.body, file.contentType);
    },
    get(key) {
      assertSafeKey(key);
      return bucket.load(key);
    },
    async remove(key) {
      assertSafeKey(key);
      await bucket.delete(key);
    },
    signedUrl(key, { expiresInSeconds, downloadName }) {
      assertSafeKey(key);
      const expires = new Date(now() + expiresInSeconds * MILLISECONDS);
      return bucket.sign(key, expires, attachmentDisposition(downloadName));
    },
  };
}
