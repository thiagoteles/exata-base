import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { refusingDuplicates, sameVersion } from "@/lib/db/conflicts";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

describe("a duplicate", () => {
  it("comes back as a 409 with the sentence that names it", async () => {
    await createUser(db, "ana@example.com");
    await expect(
      refusingDuplicates("emailTaken", () =>
        db.insert(users).values({ email: "ana@example.com", role: "member" }),
      ),
    ).rejects.toMatchObject({ status: 409, key: "emailTaken" });
  });

  it("leaves any other failure as it was", async () => {
    await expect(
      refusingDuplicates("emailTaken", () => db.execute(sql`select * from no_such_table`)),
    ).rejects.not.toMatchObject({ status: 409 });
  });
});

describe("a change over the version the form saw", () => {
  it("is written while the record is that version, and refused once it moved", async () => {
    const opened = await createUser(db, "bia@example.com");
    const write = (seen: Date, name: string) =>
      db
        .update(users)
        .set({ name })
        .where(and(eq(users.id, opened.id), sameVersion(users.updatedAt, seen)))
        .returning();
    const [saved] = await write(opened.updatedAt, "Bia");
    expect(saved?.name).toBe("Bia");
    expect(await write(opened.updatedAt, "Outra")).toEqual([]);
    expect((await write(saved?.updatedAt ?? opened.updatedAt, "Bia S."))[0]?.name).toBe("Bia S.");
  });
});
