import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { planExpiringMessage } from "./plan-emails";

describe("the warning that a year is about to end", () => {
  it("says when, what happens then, and links to the plans", async () => {
    const { subject, element } = planExpiringMessage({
      name: "Ana",
      endsOn: "09/10/2027",
      plansUrl: "http://localhost:47300/planos",
    });
    expect(subject).toBe("Seu plano termina em 09/10/2027");
    const { html, text } = await renderEmail(element);
    expect(text).toContain("termina em 09/10/2027");
    expect(text).toContain("volta ao plano gratuito");
    expect(html).toContain('href="http://localhost:47300/planos"');
  });

  it("escapes a name that is markup, and greets by name only when there is one", async () => {
    const { element } = planExpiringMessage({
      name: "<b>Ana</b>",
      endsOn: "09/10/2027",
      plansUrl: "http://localhost:47300/planos",
    });
    const { html } = await renderEmail(element);
    expect(html).not.toContain("<b>Ana</b>");
    const anonymous = await renderEmail(
      planExpiringMessage({ name: "", endsOn: "09/10/2027", plansUrl: "http://x/planos" }).element,
    );
    expect(anonymous.text).not.toContain("Olá, ");
  });
});
