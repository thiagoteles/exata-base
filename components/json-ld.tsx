import type { Thing, WithContext } from "schema-dts";

const lessThan = /</g;

/**
 * Structured data for search engines. The JSON is written into a script element, so every `<` is
 * escaped: a value with `</script>` inside could otherwise close the element and run as markup.
 */
export function JsonLd({ data }: { data: WithContext<Thing> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: typed data, with every "<" escaped
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(lessThan, "\\u003c") }}
    />
  );
}
