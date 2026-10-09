import { describe, expect, it } from "vitest";
import { withEntries } from "./catalog";
import { extractText } from "./extract";
import { slugOf } from "./keys";

const card = `export function PlanCard({ price }: { price: string }) {
  return (
    <section aria-label="Plan details">
      <h2>Choose your plan</h2>
      <input placeholder="Your e-mail" alt="Mail" />
      <p>{price}</p>
      <span>   </span>
      <b>42</b>
    </section>
  );
}
`;

describe("extracting text from a component", () => {
  const result = extractText(card, "plans", {});

  it("moves the sentences between tags and in the read props to the catalog", () => {
    expect([...result.entries]).toEqual([
      ["planCard.planDetails", "Plan details"],
      ["planCard.chooseYourPlan", "Choose your plan"],
      ["planCard.yourEMail", "Your e-mail"],
      ["planCard.mail", "Mail"],
    ]);
    expect(result.source).toContain('aria-label={t("planCard.planDetails")}');
    expect(result.source).toContain('<h2>{t("planCard.chooseYourPlan")}</h2>');
    expect(result.source).toContain('placeholder={t("planCard.yourEMail")}');
  });

  it("leaves values, blanks and numbers where they are", () => {
    expect(result.source).toContain("<p>{price}</p>");
    expect(result.source).toContain("<span>   </span>");
    expect(result.source).toContain("<b>42</b>");
  });

  it("declares t in the component, from the area, with its import", () => {
    expect(result.source).toContain('const t = useTranslations("plans");');
    expect(result.source).toContain('from "next-intl"');
  });

  it("uses the server function for an async component", () => {
    const page = extractText(
      "export async function Page() { return <h1>Plans</h1>; }",
      "plans",
      {},
    );
    expect(page.source).toContain('const t = await getTranslations("plans");');
    expect(page.source).toContain('from "next-intl/server"');
  });

  it("keeps the key of a sentence the area already has, and numbers a clash", () => {
    const existing = { planCard: { chooseYourPlan: "Choose your plan", mail: "Other" } };
    const again = extractText(card, "plans", existing);
    expect(again.entries.has("planCard.chooseYourPlan")).toBe(false);
    expect(again.source).toContain('t("planCard.chooseYourPlan")');
    expect(again.entries.get("planCard.mail2")).toBe("Mail");
  });

  it("refuses an em dash and changes nothing", () => {
    const dash = extractText("export function A() { return <p>One — two</p>; }", "x", {});
    expect(dash.problems).toHaveLength(1);
    expect(dash.replaced).toBe(0);
  });

  it("does not declare t twice", () => {
    const declared = `export function A() { const t = useTranslations("x"); return <p>Hi</p>; }`;
    expect(extractText(declared, "x", {}).source.match(/const t =/g)).toHaveLength(1);
  });
});

describe("keys", () => {
  it("are camel case without accents, from the first words", () => {
    expect(slugOf("Escolha o seu plano, por favor")).toBe("escolhaOSeuPlano");
    expect(slugOf("Já tem conta?")).toBe("jaTemConta");
    expect(slugOf("123")).toBe("text");
  });

  it("add a sentence at its dotted key and refuse to bury a sentence", () => {
    expect(withEntries({ a: { b: "x" } }, new Map([["a.c", "y"]]))).toEqual({
      a: { b: "x", c: "y" },
    });
    expect(() => withEntries({ a: "x" }, new Map([["a.c", "y"]]))).toThrow();
  });
});
