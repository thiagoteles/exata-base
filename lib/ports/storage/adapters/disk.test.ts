import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiskStorage } from "./disk";

let directory = "";
let clock = 1_700_000_000_000;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "storage-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function setup() {
  return createDiskStorage({
    directory,
    secret: "s".repeat(32),
    baseUrl: "http://localhost:3300",
    now: () => clock,
  });
}

async function stored() {
  const disk = setup();
  await disk.storage.put("files/u1/a.pdf", {
    body: new Uint8Array([1, 2, 3]),
    contentType: "application/pdf",
  });
  const url = new URL(
    await disk.storage.signedUrl("files/u1/a.pdf", {
      expiresInSeconds: 60,
      downloadName: "Recibo março.pdf",
    }),
  );
  return { disk, url };
}

describe("disk storage", () => {
  it("serves a file to whoever holds the signed URL", async () => {
    const { disk, url } = await stored();
    expect(url.pathname).toBe("/storage/files/u1/a.pdf");
    const file = await disk.readSigned("files/u1/a.pdf", url.searchParams);
    expect(file).toEqual({
      body: new Uint8Array([1, 2, 3]),
      contentType: "application/pdf",
      downloadName: "Recibo março.pdf",
    });
  });

  it("refuses an expired URL", async () => {
    const { disk, url } = await stored();
    clock += 61_000;
    expect(await disk.readSigned("files/u1/a.pdf", url.searchParams)).toBeNull();
    clock -= 61_000;
  });

  it("refuses a URL whose key, expiry or name was changed", async () => {
    const { disk, url } = await stored();
    expect(await disk.readSigned("files/u1/b.pdf", url.searchParams)).toBeNull();
    for (const [name, value] of [
      ["expires", "9999999999"],
      ["name", "outro.pdf"],
      ["signature", "x"],
    ] as const) {
      const tampered = new URLSearchParams(url.searchParams);
      tampered.set(name, value);
      expect(await disk.readSigned("files/u1/a.pdf", tampered)).toBeNull();
    }
  });

  it("forgets a removed file", async () => {
    const { disk, url } = await stored();
    await disk.storage.remove("files/u1/a.pdf");
    expect(await disk.readSigned("files/u1/a.pdf", url.searchParams)).toBeNull();
  });

  it("never writes outside its directory", async () => {
    const disk = setup();
    for (const key of ["../escape", "/etc/passwd", "a/../../b", "A/b", ""]) {
      await expect(
        disk.storage.put(key, { body: new Uint8Array(), contentType: "text/plain" }),
      ).rejects.toThrow("Unsafe storage key");
    }
  });
});
