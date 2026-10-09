"use client";

import { IconPlus } from "@tabler/icons-react";
import { Accordion as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Size } from "./styles";

type Item = { value: string; title: string; content: ReactNode; disabled?: boolean };

type AccordionProps = {
  items: readonly Item[];
  /** `single` keeps one open at a time; `multiple` lets each be opened on its own. */
  type?: "single" | "multiple";
  /** What is open when the page first draws. */
  defaultOpen?: readonly string[];
  size?: Size;
};

const titles: Record<Size, string> = {
  sm: "py-3 text-field-label",
  md: "py-4 text-block-title",
};

/**
 * Questions and answers, or any list whose details most people skip. A ruled list: each title is a
 * full-width line with a plus that turns into a cross when it opens. Closed content is not in the
 * page at all, so a page that wants it found by search engines says it again as structured data.
 */
export function Accordion({
  items,
  type = "single",
  defaultOpen = [],
  size = "md",
}: AccordionProps) {
  const shared = { className: "divide-y divide-line border-y border-line" };
  const rows = items.map((item) => (
    <Primitive.Item
      key={item.value}
      value={item.value}
      {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
    >
      <Primitive.Header>
        <Primitive.Trigger
          className={cn(
            "group flex w-full items-center justify-between gap-6 text-start text-ink",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            "disabled:opacity-50",
            titles[size],
          )}
        >
          {item.title}
          <IconPlus
            className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-45 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Primitive.Trigger>
      </Primitive.Header>
      <Primitive.Content className="pb-4 text-body text-ink-muted">
        <div className="max-w-[62ch]">{item.content}</div>
      </Primitive.Content>
    </Primitive.Item>
  ));
  return type === "single" ? (
    <Primitive.Root
      type="single"
      collapsible
      {...(defaultOpen[0] === undefined ? {} : { defaultValue: defaultOpen[0] })}
      {...shared}
    >
      {rows}
    </Primitive.Root>
  ) : (
    <Primitive.Root type="multiple" defaultValue={[...defaultOpen]} {...shared}>
      {rows}
    </Primitive.Root>
  );
}
