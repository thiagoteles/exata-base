import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Viewer } from "@/lib/access/rules";
import type { IsoDate } from "@/lib/date";
import { sampleItems } from "@/lib/db/schema/sample-items";
import { sampleParts } from "@/lib/db/schema/sample-parts";
import { users } from "@/lib/db/schema/users";
import { deleteSampleItem } from "@/lib/sample-items/records";
import {
  createSamplePart,
  deleteSamplePart,
  getSamplePart,
  querySampleParts,
  type SamplePartInput,
  type SamplePartsQuery,
  samplePartParents,
  samplePartsOfSampleItem,
  updateSamplePart,
} from "@/lib/sample-parts/records";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

const everything: SamplePartsQuery = { q: "", status: null, sort: "name", dir: "asc", page: 1 };

async function viewer(email: string, role: Viewer["role"] = "member"): Promise<Viewer> {
  const user = await createUser(db, email, role);
  return { id: user.id, role };
}

/** A sample item of the account, written straight to its table, so its own fields do not matter. */
async function parentOf(account: Viewer, name = "Pai") {
  const [row] = await db.insert(sampleItems).values({ ownerId: account.id, name }).returning();
  if (row === undefined) {
    throw new Error("the sample item was not stored");
  }
  return row;
}

/** An account with one sample item, and the input of a record filed under it. */
async function accountWithParent(email: string, name = "Pai") {
  const account = await viewer(email);
  const parent = await parentOf(account, name);
  const item = (over: Partial<SamplePartInput> = {}): SamplePartInput => ({
    sampleItemId: parent.id,
    name: "Primeiro",
    code: null,
    status: "open",
    dueDate: null,
    notes: null,
    ...over,
  });
  return { account, parent, item };
}

describe("who sees which sample part", () => {
  it("shows an account only its own, and the team everyone's", async () => {
    const ana = await accountWithParent("ana@example.com");
    const bia = await accountWithParent("bia@example.com");
    const staff = await viewer("staff@example.com", "staff");
    await createSamplePart(db, ana.account, ana.item({ name: "Da Ana" }));
    await createSamplePart(db, bia.account, bia.item({ name: "Da Bia" }));
    const mine = await querySampleParts(db, ana.account, "mine", everything);
    expect(mine.rows.map((row) => [row.name, row.parentName])).toEqual([["Da Ana", "Pai"]]);
    expect((await querySampleParts(db, staff, "all", everything)).rows).toHaveLength(2);
    await expect(querySampleParts(db, ana.account, "all", everything)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("lets nobody read, change or delete another account's record", async () => {
    const ana = await accountWithParent("ana@example.com");
    const bia = await accountWithParent("bia@example.com");
    const theirs = await createSamplePart(db, bia.account, bia.item());
    expect(await getSamplePart(db, ana.account, "mine", theirs.id)).toBeNull();
    expect(await getSamplePart(db, ana.account, "mine", "not-an-id")).toBeNull();
    await expect(
      updateSamplePart(db, ana.account, {
        id: theirs.id,
        seen: theirs.updatedAt,
        input: ana.item(),
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(deleteSamplePart(db, ana.account, theirs.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("a sample part and the sample item it is filed under", () => {
  it("refuses a sample item of another account, or one that does not exist", async () => {
    const ana = await accountWithParent("ana@example.com");
    const bia = await accountWithParent("bia@example.com");
    for (const sampleItemId of [bia.parent.id, "0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31", "nobody"]) {
      await expect(
        createSamplePart(db, ana.account, ana.item({ sampleItemId })),
      ).rejects.toMatchObject({ status: 409, key: "samplePartParentMissing" });
    }
    const mine = await createSamplePart(db, ana.account, ana.item());
    await expect(
      updateSamplePart(db, ana.account, {
        id: mine.id,
        seen: mine.updatedAt,
        input: ana.item({ sampleItemId: bia.parent.id }),
      }),
    ).rejects.toMatchObject({ status: 409, key: "samplePartParentMissing" });
  });

  it("keeps the sample item while records are filed under it, and lets it go after", async () => {
    const ana = await accountWithParent("ana@example.com");
    const part = await createSamplePart(db, ana.account, ana.item());
    await expect(deleteSampleItem(db, ana.account, ana.parent.id)).rejects.toMatchObject({
      status: 409,
      key: "sampleItemHasLinks",
    });
    await deleteSamplePart(db, ana.account, part.id);
    await expect(deleteSampleItem(db, ana.account, ana.parent.id)).resolves.toBeUndefined();
  });

  it("moves to another of the account's sample items, and offers only the account's", async () => {
    const ana = await accountWithParent("ana@example.com", "Primeiro pai");
    await accountWithParent("bia@example.com", "Da Bia");
    const other = await parentOf(ana.account, "Outro pai");
    expect((await samplePartParents(db, ana.account)).map((row) => row.name)).toEqual([
      "Outro pai",
      "Primeiro pai",
    ]);
    const part = await createSamplePart(db, ana.account, ana.item());
    await updateSamplePart(db, ana.account, {
      id: part.id,
      seen: part.updatedAt,
      input: ana.item({ sampleItemId: other.id }),
    });
    expect(await samplePartsOfSampleItem(db, ana.account, "mine", ana.parent.id)).toEqual([]);
    const moved = await samplePartsOfSampleItem(db, ana.account, "mine", other.id);
    expect(moved.map((row) => row.name)).toEqual(["Primeiro"]);
  });

  it("goes with the account, sample items and all", async () => {
    const ana = await accountWithParent("ana@example.com");
    await createSamplePart(db, ana.account, ana.item());
    await db.delete(users).where(eq(users.id, ana.account.id));
    expect(await db.select().from(sampleParts)).toEqual([]);
    expect(await db.select().from(sampleItems)).toEqual([]);
  });
});

describe("the rules a sample part keeps", () => {
  it("refuses a code already on file in the same account, and allows it in another", async () => {
    const ana = await accountWithParent("ana@example.com");
    const bia = await accountWithParent("bia@example.com");
    await createSamplePart(db, ana.account, ana.item({ code: "a-1" }));
    await expect(
      createSamplePart(db, ana.account, ana.item({ code: "A-1" })),
    ).rejects.toMatchObject({ status: 409, key: "samplePartCodeTaken" });
    await expect(
      createSamplePart(db, bia.account, bia.item({ code: "A-1" })),
    ).resolves.toMatchObject({ code: "A-1" });
  });

  it("refuses a change over a version that is no longer the current one", async () => {
    const ana = await accountWithParent("ana@example.com");
    const opened = await createSamplePart(db, ana.account, ana.item());
    const saved = await updateSamplePart(db, ana.account, {
      id: opened.id,
      seen: opened.updatedAt,
      input: ana.item({ name: "Mudado", dueDate: "2026-12-31" as IsoDate }),
    });
    expect([saved.name, saved.dueDate]).toEqual(["Mudado", "2026-12-31"]);
    await expect(
      updateSamplePart(db, ana.account, {
        id: opened.id,
        seen: opened.updatedAt,
        input: ana.item(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("the list of sample parts", () => {
  it("searches the record and its sample item without accents, filters and pages", async () => {
    const ana = await accountWithParent("ana@example.com", "João Pai");
    await createSamplePart(db, ana.account, ana.item({ name: "Ação", code: "X-9" }));
    await createSamplePart(db, ana.account, ana.item({ name: "Outro", status: "closed" }));
    const names = async (over: Partial<SamplePartsQuery>) =>
      (await querySampleParts(db, ana.account, "mine", { ...everything, ...over })).rows.map(
        (row) => row.name,
      );
    expect(await names({ q: "acao" })).toEqual(["Ação"]);
    expect(await names({ q: "x-9" })).toEqual(["Ação"]);
    expect(await names({ q: "joao" })).toEqual(["Ação", "Outro"]);
    expect(await names({ status: "closed" })).toEqual(["Outro"]);
    expect(await names({ q: "ninguém" })).toEqual([]);
    await Promise.all(
      Array.from({ length: 23 }, (_, index) =>
        createSamplePart(db, ana.account, ana.item({ name: `Igual ${index % 2}` })),
      ),
    );
    const pages = await Promise.all(
      [1, 2].map((page) => querySampleParts(db, ana.account, "mine", { ...everything, page })),
    );
    const ids = pages.flatMap(({ rows }) => rows.map((row) => row.id));
    expect(new Set(ids).size).toBe(25);
  });
});
