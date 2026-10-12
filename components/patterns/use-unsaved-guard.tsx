"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Asks before leaving a screen with unsaved changes. A reload or closing the tab uses the
 * browser's own prompt; a click on a link inside the app opens our dialog instead. The App Router
 * cannot intercept the browser's back button, so a form that matters also keeps a draft.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        event.defaultPrevented
      ) {
        return;
      }
      const destination = new URL(link.href, globalThis.location.href);
      const here = new URL(globalThis.location.href);
      const leaves =
        destination.origin === here.origin &&
        destination.pathname + destination.search !== here.pathname + here.search;
      if (leaves) {
        event.preventDefault();
        setPending(destination.pathname + destination.search);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return {
    isAsking: pending !== null,
    stay: () => setPending(null),
    leave: () => {
      const destination = pending;
      setPending(null);
      if (destination !== null) {
        router.push(destination as never);
      }
    },
  };
}
