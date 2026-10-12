"use client";

import { useEffect } from "react";
import { rememberOption } from "@/lib/preferences/actions";

const REPORTED = "reported-time-zone";

/**
 * Tells the server which time zone this browser is in, when it is not the one saved, so "today" and
 * the dates on screen follow the person. It reports once per tab: the saved value this component
 * receives can be minutes behind what was just reported, and asking again would only repeat it.
 * Renders nothing.
 */
export function ReportTimeZone({ saved }: { saved: string }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === saved) {
      return;
    }
    try {
      if (sessionStorage.getItem(REPORTED) === zone) {
        return;
      }
      sessionStorage.setItem(REPORTED, zone);
    } catch {
      // Storage is blocked: the report may repeat on each page, and it is harmless.
    }
    // Nothing waits on the answer: a refused zone just stays unsaved, and the screens fall back.
    rememberOption({ key: "timeZone", value: zone }).catch(() => undefined);
  }, [saved]);
  return null;
}
