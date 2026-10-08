import type { Role } from "@/lib/accounts/roles";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import type { Logger } from "@/lib/ports/log/types";

export async function createUser(db: Database, email: string, role: Role = "member") {
  const [user] = await db.insert(users).values({ email, role }).returning();
  if (user === undefined) {
    throw new Error("user was not created");
  }
  return user;
}

/** A logger that keeps the messages of every error it is given. */
export function recordingLogger(errors: string[] = []): Logger {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: (message: string) => {
      errors.push(message);
    },
    child: () => logger,
  };
  return logger;
}
