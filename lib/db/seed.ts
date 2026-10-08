import type { Database } from "./database";
import { users } from "./schema/users";

/*
 * Development data. Runs on every start outside production and is idempotent: starting again
 * never duplicates a row. In local auth mode the admin also gets this known password.
 */

export const SEED_ADMIN_EMAIL = "admin@app.local";
export const SEED_ADMIN_PASSWORD = "admin-local";

/** Resolves to the admin's id. */
export async function seedDatabase(db: Database): Promise<string> {
  const [admin] = await db
    .insert(users)
    .values({ email: SEED_ADMIN_EMAIL, name: "Admin", role: "admin", emailVerified: true })
    .onConflictDoUpdate({ target: users.email, set: { role: "admin", emailVerified: true } })
    .returning({ id: users.id });
  if (admin === undefined) {
    throw new Error("seed admin was not stored");
  }
  return admin.id;
}
