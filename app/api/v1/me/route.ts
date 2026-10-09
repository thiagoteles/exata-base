import { readProfile } from "@/lib/api/profile";
import { apiPreflight, apiRoute } from "@/lib/api/route";
import { db } from "@/lib/db/client";

/** Who the token stands for: the first call a client makes to know the token works. */
export const GET = apiRoute("/api/v1/me", "profile:read", ({ caller }) =>
  readProfile(db, caller.userId),
);
export const OPTIONS = apiPreflight("/api/v1/me");
