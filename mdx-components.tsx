import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

/*
 * Markdown elements in the reading layout of the design system: the body size, generous rhythm
 * between blocks and section titles in the title face, inside a 680px column the page sets. Next
 * reads this file by name for every MDX module.
 */
const components: MDXComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-10 text-section text-ink" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 text-block-title text-ink" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => <p className="text-body text-ink" {...props} />,
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-brand-ink underline underline-offset-2" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="flex list-disc flex-col gap-2 ps-6 text-body text-ink" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="flex list-decimal flex-col gap-2 ps-6 text-body text-ink" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-line-strong border-s-[3px] ps-4 text-body text-ink-muted"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="rounded-stamp bg-sunken px-1 font-mono text-data" {...props} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
