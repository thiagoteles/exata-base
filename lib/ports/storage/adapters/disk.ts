import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeKey, type FileStorage, type StoredFile } from "../types";

/*
 * Files on the local disk, for development and for deployments without Cloud Storage. A signed
 * URL points at the app's own download route, which checks the signature and the expiry.
 */

type Options = { directory: string; secret: string; baseUrl: string; now?: () => number };

const DOWNLOAD_PATH = "/storage";
const MILLISECONDS = 1000;

function sign(secret: string, key: string, expires: number, downloadName: string): string {
  return createHmac("sha256", secret)
    .update(`${key}\n${expires}\n${downloadName}`)
    .digest("base64url");
}

export function createDiskStorage({ directory, secret, baseUrl, now = Date.now }: Options) {
  const root = path.resolve(directory);
  const filePath = (key: string) => path.join(root, key);
  const metaPath = (key: string) => `${filePath(key)}.meta.json`;

  const storage: FileStorage = {
    async put(key, file: StoredFile) {
      assertSafeKey(key);
      await mkdir(path.dirname(filePath(key)), { recursive: true });
      await writeFile(filePath(key), file.body);
      await writeFile(metaPath(key), JSON.stringify({ contentType: file.contentType }));
    },
    async get(key) {
      assertSafeKey(key);
      try {
        const [body, meta] = await Promise.all([
          readFile(filePath(key)),
          readFile(metaPath(key), "utf8"),
        ]);
        const { contentType } = JSON.parse(meta) as { contentType: string };
        return { body: new Uint8Array(body), contentType };
      } catch {
        return null;
      }
    },
    async remove(key) {
      assertSafeKey(key);
      await rm(filePath(key), { force: true });
      await rm(metaPath(key), { force: true });
    },
    signedUrl(key, { expiresInSeconds, downloadName }) {
      assertSafeKey(key);
      const expires = Math.floor(now() / MILLISECONDS) + expiresInSeconds;
      const url = new URL(`${DOWNLOAD_PATH}/${key}`, baseUrl);
      url.searchParams.set("expires", String(expires));
      url.searchParams.set("name", downloadName);
      url.searchParams.set("signature", sign(secret, key, expires, downloadName));
      return Promise.resolve(url.toString());
    },
  };

  /** Reads a file for the download route, or null when the URL is not valid right now. */
  async function readSigned(key: string, params: URLSearchParams) {
    const expires = Number(params.get("expires"));
    const downloadName = params.get("name") ?? "";
    const given = Buffer.from(params.get("signature") ?? "");
    const expected = Buffer.from(sign(secret, key, expires, downloadName));
    const isValid =
      Number.isSafeInteger(expires) &&
      expires * MILLISECONDS > now() &&
      given.length === expected.length &&
      timingSafeEqual(given, expected);
    if (!isValid) {
      return null;
    }
    const file = await storage.get(key).catch(() => null);
    return file === null ? null : { ...file, downloadName };
  }

  return { storage, readSigned };
}
