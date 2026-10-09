/*
 * Token names as the code sees them. The CSS is the source of truth; a test fails when these
 * lists drift from it, so `cn` always knows which classes conflict.
 */

export const colorTokens = [
  "background",
  "surface",
  "sunken",
  "layer",
  "line",
  "line-strong",
  "ink",
  "ink-muted",
  "action",
  "on-action",
  "brand",
  "brand-wash",
  "brand-ink",
  "focus",
  "success",
  "success-wash",
  "success-ink",
  "warning",
  "warning-wash",
  "warning-ink",
  "danger",
  "danger-wash",
  "danger-ink",
  "accent",
  "accent-wash",
  "accent-ink",
  "on-accent",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-seq-1",
  "chart-seq-2",
  "chart-seq-3",
  "chart-seq-4",
  "chart-seq-5",
  "chart-seq-6",
  "chart-seq-7",
  "chart-negative",
  "chart-middle",
  "chart-positive",
  "scrim",
] as const;

export const textTokens = [
  "display",
  "page-title",
  "section",
  "block-title",
  "body",
  "body-small",
  "field-label",
  "label",
  "button",
  "figure",
  "data",
] as const;

export const spacingTokens = [
  "control",
  "control-coarse",
  "field",
  "row",
  "chip",
  "segment",
  "bar",
  "tab",
  "sidebar",
  "panel-inset",
  "dialog-inset",
  "cell-x",
  "cell-y",
] as const;

export const containerTokens = ["dialog"] as const;

export const radiusTokens = [
  "stamp",
  "control",
  "cell",
  "panel",
  "dialog",
  "full",
  "mark",
] as const;

export const shadowTokens = ["layer"] as const;

export const easeTokens = ["enter", "exit", "move"] as const;

export const fontTokens = ["heading", "sans", "mono"] as const;
