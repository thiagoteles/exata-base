import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";

/** The frame of every sign-in screen: one panel, one task. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Panel className="flex w-full max-w-md flex-col gap-6 p-8">
      <div>
        <h1 className="text-page-title text-ink">{title}</h1>
        {subtitle === undefined ? null : (
          <p className="mt-2 text-body text-ink-muted">{subtitle}</p>
        )}
      </div>
      {children}
    </Panel>
  );
}
