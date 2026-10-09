import { describe, expect, it } from "vitest";
import { type BucketClient, createCloudStorage } from "./cloud-storage";

function fakeBucket() {
  const calls: unknown[][] = [];
  const bucket: BucketClient = {
    save: (...args) => {
      calls.push(["save", ...args]);
      return Promise.resolve();
    },
    load: (...args) => {
      calls.push(["load", ...args]);
      return Promise.resolve({ body: new Uint8Array([1]), contentType: "application/pdf" });
    },
    delete: (...args) => {
      calls.push(["delete", ...args]);
      return Promise.resolve();
    },
    sign: (...args) => {
      calls.push(["sign", ...args]);
      return Promise.resolve("https://storage.googleapis.com/signed");
    },
  };
  return { bucket, calls };
}

describe("Cloud Storage", () => {
  it("stores, signs and removes through the bucket", async () => {
    const { bucket, calls } = fakeBucket();
    const storage = createCloudStorage(bucket, () => 0);
    await storage.put("files/u1/a.pdf", {
      body: new Uint8Array([1]),
      contentType: "application/pdf",
    });
    const url = await storage.signedUrl("files/u1/a.pdf", {
      expiresInSeconds: 60,
      downloadName: "Recibo março.pdf",
    });
    const file = await storage.get("files/u1/a.pdf");
    await storage.remove("files/u1/a.pdf");

    expect(file).toEqual({ body: new Uint8Array([1]), contentType: "application/pdf" });
    expect(url).toBe("https://storage.googleapis.com/signed");
    expect(calls).toEqual([
      ["save", "files/u1/a.pdf", new Uint8Array([1]), "application/pdf"],
      [
        "sign",
        "files/u1/a.pdf",
        new Date(60_000),
        "attachment; filename*=UTF-8''Recibo%20mar%C3%A7o.pdf",
      ],
      ["load", "files/u1/a.pdf"],
      ["delete", "files/u1/a.pdf"],
    ]);
  });

  it("refuses an unsafe key before calling Google", async () => {
    const { bucket, calls } = fakeBucket();
    await expect(createCloudStorage(bucket, () => 0).remove("../x")).rejects.toThrow(
      "Unsafe storage key",
    );
    expect(calls).toEqual([]);
  });
});
