"use client";

import { useEffect } from "react";
import { identify } from "@/lib/analytics";

/** Ties the signed-in person's page views and events to their account id, and nothing else. */
export function IdentifyAccount({ accountId }: { accountId: string }) {
  useEffect(() => identify(accountId), [accountId]);
  return null;
}
