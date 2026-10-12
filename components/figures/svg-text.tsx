import { useTranslations } from "next-intl";
import type { MessageKey } from "@/lib/i18n/message-key";

/*
 * Text inside a figure. Words come from the catalog by key, so a figure never carries a sentence of
 * its own, and what is only notation (a number already formatted, a note name, a unit symbol) comes
 * from a domain function as `text`. Either way the style is one of the interface's own roles, never a
 * size written by hand, and a halo of the surface color keeps it legible over the marks it sits on.
 */

type Variant = "label" | "data" | "body-small";
type Tone = "ink" | "muted" | "on-action";
type Anchor = "start" | "middle" | "end";

type Common = {
  x: number;
  y: number;
  anchor?: Anchor;
  variant?: Variant;
  tone?: Tone;
  /** A stroke in the surface color behind the letters, for text that crosses a mark. */
  halo?: boolean;
};

type SvgTextProps = Common &
  (
    | { messageKey: MessageKey; values?: Record<string, string | number>; text?: never }
    | { text: string; messageKey?: never; values?: never }
  );

const variants: Record<Variant, string> = {
  label: "text-label",
  data: "font-mono text-data tabular-nums",
  "body-small": "text-body-small",
};
const tones: Record<Tone, string> = {
  ink: "fill-ink",
  muted: "fill-ink-muted",
  "on-action": "fill-on-action",
};

export function SvgText({
  x,
  y,
  anchor = "middle",
  variant = "label",
  tone = "ink",
  halo = false,
  messageKey,
  values,
  text,
}: SvgTextProps) {
  const t = useTranslations();
  // The catalog's typing narrows `values` per key; a key chosen at run time cannot be narrowed.
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const content = messageKey === undefined ? text : translate(messageKey, values);
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`${variants[variant]} ${tones[tone]}${halo ? " stroke-surface [paint-order:stroke]" : ""}`}
      strokeWidth={halo ? 3 : undefined}
      strokeLinejoin="round"
    >
      {content}
    </text>
  );
}
