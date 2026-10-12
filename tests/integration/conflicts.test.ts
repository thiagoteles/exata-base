import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { refusingBrokenLinks, refusingDuplicates, sameVersion } from "@/lib/db/conflicts";
import { files } from "@/lib/db/schema/files";
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

describe("a broken link", () => {
  it("comes back as a 409 with the sentence that names it", async () => {
    await expect(
      refusingBrokenLinks("notFound", () =>
        db.insert(files).values({
          ownerId: "0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31",
          name: "file.pdf",
          contentType: "application/pdf",
          sizeBytes: 1,
          storageKey: "nobody/file",
        }),
      ),
    ).rejects.toMatchObject({ status: 409, key: "notFound" });
  });

  it("leaves a duplicate to the other refusal", async () => {
    await createUser(db, "caio@example.com");
    await expect(
      refusingBrokenLinks("notFound", () =>
        db.insert(users).values({ email: "caio@example.com", role: "member" }),
      ),
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
