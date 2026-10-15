import { afterEach, describe, expect, it, vi } from "vitest";
import { shareImage } from "./share-image";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the share image", () => {
  it("draws a page's title, alone or beside the product's picture, even when the fonts cannot be fetched", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    const plain = await shareImage({ title: "Planos", subtitle: "Preços e o que cada um traz" });
    const beside = await shareImage({
      title: "Planos",
      subtitle: "Preços e o que cada um traz",
      aside: <div style={{ display: "flex", width: 200, height: 200, background: "#ffffff" }} />,
    });
    for (const image of [plain, beside]) {
      expect(image.headers.get("content-type")).toBe("image/png");
      expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(0);
    }
  });
});
