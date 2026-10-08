import { env } from "@/lib/env";
import { createDiskStorage } from "./adapters/disk";
import type { FileStorage } from "./types";

/*
 * The storage port. With the GCP variables set, files go to Cloud Storage; without them, to the
 * local disk. The disk adapter is light and also serves its own download route, so it is loaded
 * directly; the Cloud Storage SDK is loaded only when the keys exist.
 */

const disk = createDiskStorage({
  directory: env.STORAGE_DIR,
  secret: env.FILE_URL_SECRET,
  baseUrl: env.APP_URL,
});

async function loadStorage(): Promise<FileStorage> {
  if (
    env.GCP_CREDENTIALS !== undefined &&
    env.GCP_PROJECT !== undefined &&
    env.GCS_BUCKET !== undefined
  ) {
    const { createCloudStorage, googleBucket } = await import("./adapters/cloud-storage");
    return createCloudStorage(googleBucket(env.GCP_CREDENTIALS, env.GCP_PROJECT, env.GCS_BUCKET));
  }
  return disk.storage;
}

let storage: Promise<FileStorage> | undefined;

export function fileStorage(): Promise<FileStorage> {
  storage ??= loadStorage();
  return storage;
}

/** For the download route. Null when Cloud Storage is in use or the URL is not valid. */
export function readLocalFile(key: string, params: URLSearchParams) {
  if (env.GCS_BUCKET !== undefined) {
    return Promise.resolve(null);
  }
  return disk.readSigned(key, params);
}
