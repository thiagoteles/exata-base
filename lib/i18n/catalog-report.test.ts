import { describe, expect, it } from "vitest";
import { reportCatalog } from "./catalog-report";

const base = {
  nav: { home: "Início", plans: "Planos" },
  home: { title: "Olá {name}", body: "Texto" },
};

describe("the report on a language", () => {
  it("refuses a complete language that misses a key", () => {
    const report = reportCatalog({
      locale: "en-US",
      defaultLocale: "pt-BR",
      complete: true,
      base,
      other: {
        nav: { home: "Home", plans: "Plans" },
        home: { title: "Hello {name}" },
      },
    });
    expect(report.problems).toEqual(["messages/en-US.json: missing key: home.body"]);
    expect(report.notes).toEqual([]);
  });

  it("counts what an incomplete language misses instead of refusing it", () => {
    const report = reportCatalog({
      locale: "en-US",
      defaultLocale: "pt-BR",
      complete: false,
      base,
      other: { nav: { home: "Home" } },
    });
    expect(report.problems).toEqual([]);
    expect(report.notes[0]).toBe(
      "en-US is not complete: 1 of 4 messages translated (25%); the rest shows in pt-BR.",
    );
    expect(report.notes.slice(1)).toEqual(["  home: 2 missing", "  nav: 1 missing"]);
  });

  it("refuses a key the default lacks and a changed argument, complete or not", () => {
    const other = {
      nav: { home: "Home", plans: "Plans", extra: "x" },
      home: { title: "Hi {who}" },
    };
    for (const complete of [true, false]) {
      expect(
        reportCatalog({ locale: "en-US", defaultLocale: "pt-BR", complete, base, other }).problems,
      ).toEqual(
        expect.arrayContaining([
          "messages/en-US.json: different arguments in: home.title",
          "messages/en-US.json: extra key: nav.extra",
        ]),
      );
    }
  });
});
