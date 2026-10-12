import { createHash, randomBytes } from "node:crypto";
import { and, count, desc, eq, isNull, lt, or } from "drizzle-orm";
import {
  type ApiScope,
  allows,
  isUsable,
  MAX_TOKENS_PER_PERSON,
  TOKEN_PREFIX,
  visiblePart,
} from "@/domain/api/tokens";
import type { Database } from "@/lib/db/database";
import { apiTokens } from "@/lib/db/schema/api-tokens";
import { users } from "@/lib/db/schema/users";
import { DomainError } from "@/lib/errors";

/*
 * Personal API tokens, against the database only. The token is random and shown once; the database
 * keeps its hash, so a copy of it cannot be turned into working access. A token belongs to the
 * person who made it, carries the scopes they chose, and is deleted with the account.
 */

const TOKEN_BYTES = 32;
const MINUTE_MS = 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

export type TokenSummary = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

/** Makes a token and returns it once; nothing afterwards can show it again. */
export async function createApiToken(
  db: Database,
  userId: string,
  input: { name: string; scopes: readonly ApiScope[]; expiresAt: Date | null },
): Promise<{ token: string; id: string }> {
  const token = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("base64url")}`;
  return await db.transaction(async (tx) => {
    const [held] = await tx
      .select({ total: count() })
      .from(apiTokens)
      .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)));
    if ((held?.total ?? 0) >= MAX_TOKENS_PER_PERSON) {
      throw new DomainError(409);
    }
    const [row] = await tx
      .insert(apiTokens)
      .values({
        userId,
        name: input.name,
        tokenHash: hashToken(token),
        prefix: visiblePart(token),
        scopes: [...input.scopes],
        expiresAt: input.expiresAt,
      })
      .returning({ id: apiTokens.id });
    if (row === undefined) {
      throw new Error("token was not created");
    }
    return { token, id: row.id };
  });
}

/** The person's tokens still in force, newest first. */
export function listApiTokens(db: Database, userId: string): Promise<TokenSummary[]> {
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt));
}

/** Revokes one of the person's own tokens. False when it is not theirs or already revoked. */
export async function revokeApiToken(
  db: Database,
  userId: string,
  tokenId: string,
  now: Date,
): Promise<boolean> {
  const revoked = await db
    .update(apiTokens)
    .set({ revokedAt: now })
    .where(
      and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)),
    )
    .returning({ id: apiTokens.id });
  return revoked.length > 0;
}

export type ApiCaller = { tokenId: string; userId: string; scopes: string[] };

/**
 * Who a token stands for, or a 401. A token that is unknown, revoked or expired all answer the
 * same, and one that lacks the scope answers 403. The last-use time moves at most once a minute,
 * so reading the API does not write a row on every call.
 */
export async function authenticateApiToken(
  db: Database,
  token: string | null,
  needed: ApiScope,
  now: Date,
): Promise<ApiCaller> {
  if (token === null) {
    throw new DomainError(401);
  }
  const [row] = await db
    .select({
      id: apiTokens.id,
      userId: apiTokens.userId,
      scopes: apiTokens.scopes,
      revokedAt: apiTokens.revokedAt,
      expiresAt: apiTokens.expiresAt,
    })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(eq(apiTokens.tokenHash, hashToken(token)));
  if (row === undefined || !isUsable(row, now)) {
    throw new DomainError(401);
  }
  if (!allows(row.scopes, needed)) {
    throw new DomainError(403);
  }
  await db
    .update(apiTokens)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(apiTokens.id, row.id),
        or(
          isNull(apiTokens.lastUsedAt),
          lt(apiTokens.lastUsedAt, new Date(now.getTime() - MINUTE_MS)),
        ),
      ),
    );
  return { tokenId: row.id, userId: row.userId, scopes: row.scopes };
}
