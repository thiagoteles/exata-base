import { readProfile, renameProfile } from "@/lib/api/profile";
import { apiPreflight, apiRoute, apiWrite } from "@/lib/api/route";
import { db } from "@/lib/db/client";
import { z } from "@/lib/validation";

const MAX_NAME = 120;
const renaming = z.object({ name: z.string().trim().min(1).max(MAX_NAME) });

/** Who the token stands for: the first call a client makes to know the token works. */
export const GET = apiRoute("/api/v1/me", "profile:read", ({ caller }) =>
  readProfile(db, caller.userId),
);
/** Changes the holder's name: `{ "name": "Ana Souza" }`. */
export const PATCH = apiWrite("/api/v1/me", "profile:write", renaming, ({ caller, body }) =>
  renameProfile(db, caller.userId, body.name),
);
export const OPTIONS = apiPreflight("/api/v1/me");
