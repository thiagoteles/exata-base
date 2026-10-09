import { describe, expect, it } from "vitest";
import { organizationData, websiteData } from "./structured-data";

describe("structured data", () => {
  it("describes the organization and the site with absolute addresses", () => {
    expect(organizationData("https://exemplo.com.br", "Meu produto", "Faz algo")).toMatchObject({
      "@type": "Organization",
      url: "https://exemplo.com.br/",
      logo: "https://exemplo.com.br/icon",
    });
    expect(websiteData("https://exemplo.com.br", "Meu produto")).toMatchObject({
      "@type": "WebSite",
      inLanguage: "pt-BR",
    });
  });
});
