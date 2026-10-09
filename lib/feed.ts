/*
 * An RSS 2.0 feed, built as text with every value escaped: a title with "&" or "<" would otherwise
 * break the XML and make readers drop the whole feed. Addresses are absolute.
 */

type FeedItem = { title: string; description: string; url: string; publishedAt: Date };

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
const special = /[&<>"']/g;
const escapeXml = (value: string) => value.replace(special, (char) => entities[char] ?? char);

export function renderFeed(channel: {
  title: string;
  description: string;
  url: string;
  items: readonly FeedItem[];
}): string {
  const items = channel.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.url)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>pt-BR</language>
${items}
  </channel>
</rss>
`;
}
