import type { ReactNode } from "react";
import { Suspense } from "react";
import { productAppShell } from "@/components/shell/app-chrome.product";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeToggle } from "@/features/account/theme-toggle";
import { BottomBarSlot, SidebarSlot, UserMenuSlot } from "./shell-slots";

// A product that draws its own frame gets the same slots the base's is given.
const Shell = productAppShell ?? AppShell;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Shell
      sidebar={
        <Suspense>
          <SidebarSlot />
        </Suspense>
      }
      bottomBar={
        <Suspense>
          <BottomBarSlot />
        </Suspense>
      }
      userMenu={
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Suspense>
            <UserMenuSlot />
          </Suspense>
        </div>
      }
    >
      {children}
    </Shell>
  );
}
