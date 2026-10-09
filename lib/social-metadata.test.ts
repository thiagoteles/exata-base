import { describe, expect, it, vi } from "vitest";
import { buildSocialMetadata } from "./social-metadata";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

describe("social metadata", () => {
  it("always carries an absolute image, even when the page sets none", async () => {
    const metadata = await buildSocialMetadata({
      title: "Planos",
      description: "Preços",
      path: "/plans",
    });
    expect(metadata.openGraph?.images).toEqual([{ url: "http://localhost:3300/opengraph-image" }]);
    expect(metadata.twitter?.images).toEqual(["http://localhost:3300/opengraph-image"]);
    // The page passes its route; the canonical is the public address.
    expect(metadata.alternates?.canonical).toBe("http://localhost:3300/planos");
  });
});
