import { describe, expect, it } from "vitest";
import { renderFeed } from "./feed";

describe("feed", () => {
  it("escapes every value, so a title cannot break the XML", () => {
    const xml = renderFeed({
      title: "Notas & novidades",
      description: "<b>tudo</b>",
      url: "https://exemplo.com.br/artigos",
      items: [
        {
          title: 'Um "título" com < e >',
          description: "x",
          url: "https://exemplo.com.br/artigos/a?x=1&y=2",
          publishedAt: new Date("2026-06-01T12:00:00Z"),
        },
      ],
    });
    expect(xml).toContain("<title>Notas &amp; novidades</title>");
    expect(xml).toContain("&lt;b&gt;tudo&lt;/b&gt;");
    expect(xml).toContain("Um &quot;título&quot; com &lt; e &gt;");
    expect(xml).toContain("a?x=1&amp;y=2");
    expect(xml).toContain("<pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>");
  });
});
