import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("pt-BR") }));
vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://exemplo.com.br", GOOGLE_SITE_VERIFICATION: "token-123" },
}));

const { buildSocialMetadata } = await import("./social-metadata");

describe("social metadata", () => {
  it("builds every URL from the runtime address, the canonical at the public address", async () => {
    const metadata = await buildSocialMetadata({
      title: "Planos",
      description: "Preços",
      path: "/plans",
    });
    expect(metadata.alternates?.canonical).toBe("https://exemplo.com.br/planos");
    expect(metadata.openGraph?.images).toEqual([{ url: "https://exemplo.com.br/opengraph-image" }]);
    expect(metadata.twitter?.images).toEqual(["https://exemplo.com.br/opengraph-image"]);
    expect(metadata.openGraph).toMatchObject({ type: "website", locale: "pt_BR" });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.verification).toBeUndefined();
  });

  it("marks an article with its dates", async () => {
    const metadata = await buildSocialMetadata({
      title: "Como conferir",
      description: "Passo a passo",
      path: "/terms",
      article: {
        publishedAt: new Date("2026-06-01T12:00:00Z"),
        modifiedAt: new Date("2026-06-03T12:00:00Z"),
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-06-01T12:00:00.000Z",
      modifiedTime: "2026-06-03T12:00:00.000Z",
    });
  });

  it("keeps a page out of the index on request, still following its links", async () => {
    const metadata = await buildSocialMetadata({
      title: "Busca",
      description: "Resultados",
      path: "/plans",
      index: false,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("puts the Search Console token on the home page only", async () => {
    const home = await buildSocialMetadata({ title: "Início", description: "x", path: "/" });
    expect(home.verification).toEqual({ google: "token-123" });
  });
});
