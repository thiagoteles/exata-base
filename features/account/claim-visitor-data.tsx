"use client";

import { useEffect } from "react";
import { clearVisitorValue, readAllVisitorValues } from "@/lib/browser-storage";
import { claimVisitorData } from "@/lib/preferences/actions";

/**
 * Hands the account what this browser kept while the person was a visitor, the first time a signed-in
 * page opens, and then forgets it here: nothing stays on a machine the person may not own. It runs
 * once per page load and does nothing when there is nothing to hand over. Renders nothing.
 */
export function ClaimVisitorData() {
  useEffect(() => {
    const values = readAllVisitorValues();
    if (Object.keys(values).length === 0) {
      return;
    }
    claimVisitorData({ values })
      .then((result) => {
        for (const key of result?.data?.handled ?? []) {
          clearVisitorValue(key);
        }
      })
      // The values stay in this browser and the next signed-in page asks again.
      .catch(() => undefined);
  }, []);
  return null;
}
