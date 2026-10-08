import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * True when the Authorization header carries the secret as a bearer token. With no secret
 * configured nothing is authorized. Both sides are hashed first, so the comparison takes the same
 * time whatever the header holds.
 */
export function isAuthorizedCall(secret: string | undefined, header: string | null): boolean {
  if (secret === undefined) {
    return false;
  }
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}
