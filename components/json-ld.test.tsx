import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./json-ld";

describe("JSON-LD", () => {
  it("cannot be closed early by a value that carries a script tag", () => {
    const markup = renderToStaticMarkup(
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "</script><script>alert(1)</script>",
        }}
      />,
    );
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
    expect(markup).toContain("\\u003c/script>");
  });
});
