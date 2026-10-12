import type { ReactNode } from "react";

/*
 * The shell of a printed page: nothing but the sheet. No navigation, and the light palette whatever
 * the person's theme, since a sheet is paper. The signed-in shell is not used, so there is no
 * scrolling frame to cut the page short when it prints.
 */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-paper
      className="min-h-dvh bg-background px-4 py-8 text-ink print:bg-surface print:p-0"
    >
      {children}
    </div>
  );
}
