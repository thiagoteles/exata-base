import { Accordion } from "@/components/ui/accordion";

export type FaqItem = { id: string; question: string; answer: string };

/**
 * Questions people ask, as a ruled list that opens one answer at a time. The answers are plain text,
 * so the same list can be handed to search engines as structured data (`faqData`): what the page
 * shows and what it declares never drift apart.
 */
export function Faq({ items, defaultOpen }: { items: readonly FaqItem[]; defaultOpen?: string }) {
  return (
    <Accordion
      {...(defaultOpen === undefined ? {} : { defaultOpen: [defaultOpen] })}
      items={items.map((item) => ({
        value: item.id,
        title: item.question,
        content: <p>{item.answer}</p>,
      }))}
    />
  );
}
