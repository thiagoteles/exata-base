import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
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
        <Suspense>
          <UserMenuSlot />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
