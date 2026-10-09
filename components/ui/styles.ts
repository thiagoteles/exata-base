import { cn } from "@/lib/cn";

/* Class strings shared by several primitives, so one control looks the same everywhere. */

const variants = {
  primary: "bg-action text-on-action hover:brightness-110",
  secondary: "border-2 border-line-strong bg-surface text-ink hover:border-ink",
  danger: "bg-danger text-on-action hover:brightness-110",
} as const;

export type ButtonVariant = keyof typeof variants;

export const buttonClasses = (variant: ButtonVariant) =>
  cn(
    "inline-flex h-control items-center justify-center gap-2 rounded-control px-4.5 text-button font-semibold pointer-coarse:h-control-coarse",
    "transition-[filter,border-color] duration-120 ease-enter active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:cursor-default disabled:opacity-50",
    variants[variant],
  );

/* Every control a person types into or picks from shares this anatomy. */
export const controlClasses = cn(
  "h-field w-full rounded-control border-2 border-line-strong bg-surface px-4 text-body text-ink",
  "placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-wash",
  "aria-[invalid=true]:border-danger disabled:cursor-default disabled:opacity-50",
);

/* A floating layer: menus, popovers, selects and tooltips. */
export const layerClasses = cn(
  "z-50 rounded-control bg-layer text-ink shadow-layer",
  "data-[state=closed]:animate-layer-out data-[state=open]:animate-layer-in",
);

export const overlayClasses =
  "fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";

/* A dialog on wide screens, a sheet rising from the bottom edge below `md`. */
export const dialogContentClasses = cn(
  "fixed z-50 flex max-h-dvh flex-col gap-2 overflow-y-auto bg-layer p-dialog-inset text-ink shadow-layer",
  "max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-dialog max-md:pb-[max(var(--spacing-dialog-inset),env(safe-area-inset-bottom))]",
  "max-md:data-[state=closed]:animate-sheet-out max-md:data-[state=open]:animate-sheet-in",
  "md:top-1/2 md:left-1/2 md:w-dialog md:max-w-[calc(100vw-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-dialog",
  "md:data-[state=closed]:animate-layer-out md:data-[state=open]:animate-layer-in",
);
