import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { UNSUBSCRIBE_PLACEHOLDER, withUnsubscribe } from "@/lib/ports/email/unsubscribe";
import { ActionEmail } from "./action-email";

const content = {
  preview: "Falta pouco",
  greeting: "Olá, Ana.",
  body: "Seu teste termina amanhã.",
  action: "Escolher um plano",
  url: "https://app.test/planos",
  ignore: "Se já escolheu, ignore.",
  footer: "E-mail automático.",
};
const notice = { reason: "Você recebe isto porque ligou esse aviso.", action: "Parar de receber" };

describe("an e-mail with a way out", () => {
  it("leaves a place for the recipient's own link in both versions", async () => {
    const { html, text } = await renderEmail(<ActionEmail {...content} unsubscribe={notice} />);
    expect(html).toContain(`href="${UNSUBSCRIBE_PLACEHOLDER}"`);
    expect(html).toContain("Parar de receber");
    expect(text).toContain("Parar de receber");
    expect(text).toContain(UNSUBSCRIBE_PLACEHOLDER);
  });

  it("gets that link when it is sent to someone", async () => {
    const { html, text } = await renderEmail(<ActionEmail {...content} unsubscribe={notice} />);
    const links = {
      page: "https://app.test/descadastrar?token=t",
      oneClick: "https://app.test/api/unsubscribe?token=t",
    };
    const own = withUnsubscribe(
      { to: "ana@example.com", category: "reminder", subject: "Falta pouco", html, text },
      "ana@example.com",
      links,
    );
    expect(own.html).toContain(`href="${links.page}"`);
    expect(own.html).not.toContain("{{");
    expect(own.text).toContain(links.page);
  });

  it("has no way out when it is something the person needs", async () => {
    const { html, text } = await renderEmail(<ActionEmail {...content} />);
    expect(html).not.toContain(UNSUBSCRIBE_PLACEHOLDER);
    expect(text).not.toContain("Parar de receber");
  });
});
