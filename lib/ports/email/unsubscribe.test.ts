import { describe, expect, it } from "vitest";
import type { EmailMessage } from "./types";
import { UNSUBSCRIBE_PLACEHOLDER, withUnsubscribe } from "./unsubscribe";

const links = {
  page: "https://app.test/descadastrar?token=t",
  oneClick: "https://app.test/api/unsubscribe?token=t",
};
const message: EmailMessage = {
  to: ["ana@example.com", "bia@example.com"],
  category: "news",
  subject: "Novidades",
  html: `<p>Oi</p><a href="${UNSUBSCRIBE_PLACEHOLDER}">Sair</a>`,
  text: `Oi\nSair: ${UNSUBSCRIBE_PLACEHOLDER}`,
};

describe("a message for one recipient", () => {
  it("goes to that address alone, with their link in both bodies", () => {
    const own = withUnsubscribe(message, "ana@example.com", links);
    expect(own.to).toBe("ana@example.com");
    expect(own.html).toContain(`href="${links.page}"`);
    expect(own.text).toContain(links.page);
    expect(own.html).not.toContain("{{");
    expect(own.text).not.toContain("{{");
  });

  it("carries the headers that make the mail client's own button work", () => {
    const { headers } = withUnsubscribe(message, "ana@example.com", links);
    expect(headers).toEqual({
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("replaces every placeholder, and keeps the headers the message already had", () => {
    const twice = {
      ...message,
      html: `${message.html}${message.html}`,
      headers: { "X-Campaign": "a" },
    };
    const own = withUnsubscribe(twice, "ana@example.com", links);
    expect(own.html.split(links.page)).toHaveLength(3);
    expect(own.headers).toMatchObject({
      "X-Campaign": "a",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("leaves the message it was given as it was", () => {
    withUnsubscribe(message, "ana@example.com", links);
    expect(message.to).toEqual(["ana@example.com", "bia@example.com"]);
    expect(message.html).toContain(UNSUBSCRIBE_PLACEHOLDER);
  });
});
