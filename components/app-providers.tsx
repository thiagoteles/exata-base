"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

/** The client-side context every screen can rely on: URL state, toasts and tooltips. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <TooltipProvider>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
