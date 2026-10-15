import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeToggle } from "@/features/account/theme-toggle";
import { BottomBarSlot, SidebarSlot, UserMenuSlot } from "./shell-slots";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
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
    </AppShell>
  );
}
