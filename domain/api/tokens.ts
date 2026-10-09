/*
 * The rules of a personal API token that need no database: what a token looks like, which scopes
 * exist, whether a granted set covers what a call needs, and whether a stored token still works.
 * A token is shown once, when it is made; only its hash is kept.
 */

/** What a token may be allowed to do. A product adds its own, one per kind of access. */
export const apiScopes = ["profile:read"] as const;
export type ApiScope = (typeof apiScopes)[number];

export const TOKEN_PREFIX = "exb_";
/** How many characters of a token stay visible in the list, so a person can tell tokens apart. */
const VISIBLE_CHARS = 8;
export const MAX_TOKENS_PER_PERSON = 10;

const BEARER = /^Bearer ([A-Za-z0-9_-]+)$/;

/** The token in an `Authorization: Bearer` header, or null when the header is not one. */
export function bearerOf(header: string | null): string | null {
  return (header !== null && BEARER.exec(header)?.[1]) || null;
}

/** The start of a token that is safe to show in a list. */
export const visiblePart = (token: string): string => token.slice(0, VISIBLE_CHARS);

export const isApiScope = (value: string): value is ApiScope =>
  (apiScopes as readonly string[]).includes(value);

export const allows = (granted: readonly string[], needed: ApiScope): boolean =>
  granted.includes(needed);

export type TokenState = { revokedAt: Date | null; expiresAt: Date | null };

/** A revoked token never works again; an expired one stops at the instant it names. */
export const isUsable = (token: TokenState, now: Date): boolean =>
  token.revokedAt === null &&
  (token.expiresAt === null || token.expiresAt.getTime() > now.getTime());
