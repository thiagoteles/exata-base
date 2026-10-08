import { rm } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { fileStorage, readLocalFile } from ".";

afterAll(async () => {
  await rm(env.STORAGE_DIR, { recursive: true, force: true });
});

describe("storage port", () => {
  it("keeps files on disk without Cloud Storage, readable only through the signed URL", async () => {
    const storage = await fileStorage();
    await storage.put("tests/port.txt", {
      body: new TextEncoder().encode("oi"),
      contentType: "text/plain",
    });
    const url = new URL(
      await storage.signedUrl("tests/port.txt", { expiresInSeconds: 60, downloadName: "port.txt" }),
    );

    expect(url.origin).toBe(env.APP_URL);
    expect(await readLocalFile("tests/port.txt", url.searchParams)).toMatchObject({
      contentType: "text/plain",
    });
    expect(await readLocalFile("tests/port.txt", new URLSearchParams())).toBeNull();
  });
});
