import { describe, expect, it } from "vitest";
import {
  breadcrumbData,
  faqData,
  organizationData,
  productData,
  websiteData,
} from "./structured-data";

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

  it("declares the questions exactly as they are shown", () => {
    const data = faqData([{ question: "Posso cancelar?", answer: "Sim." }]);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Posso cancelar?",
        acceptedAnswer: { "@type": "Answer", text: "Sim." },
      },
    ]);
  });

  it("offers a product at decimal prices in capital currency codes, with the runtime address", () => {
    const data = productData(
      "https://exemplo.com.br",
      { name: "Plano pago", description: "Tudo incluso", path: "/planos" },
      [
        { name: "Mensal", cents: 1990, currency: "brl" },
        { name: "Anual", cents: 19_900, currency: "brl" },
      ],
    );
    expect(data.url).toBe("https://exemplo.com.br/planos");
    expect(data.offers).toEqual([
      expect.objectContaining({ name: "Mensal", price: "19.90", priceCurrency: "BRL" }),
      expect.objectContaining({ name: "Anual", price: "199.00", priceCurrency: "BRL" }),
    ]);
  });

  it("numbers the steps of a trail from one and leaves the last without a link", () => {
    const data = breadcrumbData("https://exemplo.com.br", [
      { name: "Início", path: "/" },
      { name: "Artigos", path: "/artigos" },
      { name: "Como começar" },
    ]);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: "https://exemplo.com.br/" },
      { "@type": "ListItem", position: 2, name: "Artigos", item: "https://exemplo.com.br/artigos" },
      { "@type": "ListItem", position: 3, name: "Como começar" },
    ]);
  });
});
