import { describe, expect, it } from "vitest";
import type { Viewer } from "@/lib/access/rules";
import type { IsoDate } from "@/lib/date";
import {
  createSampleItem,
  deleteSampleItem,
  getSampleItem,
  querySampleItems,
  type SampleItemInput,
  type SampleItemsQuery,
  updateSampleItem,
} from "@/lib/sample-items/records";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

const item = (over: Partial<SampleItemInput> = {}): SampleItemInput => ({
  name: "Primeiro",
  code: null,
  status: "open",
  dueDate: null,
  notes: null,
  ...over,
});

const everything: SampleItemsQuery = { q: "", status: null, sort: "name", dir: "asc", page: 1 };

async function viewer(email: string, role: Viewer["role"] = "member"): Promise<Viewer> {
  const user = await createUser(db, email, role);
  return { id: user.id, role };
}

describe("who sees which sample item", () => {
  it("shows an account only its own, and the team everyone's", async () => {
    const ana = await viewer("ana@example.com");
    const bia = await viewer("bia@example.com");
    const staff = await viewer("staff@example.com", "staff");
    await createSampleItem(db, ana, item({ name: "Da Ana" }));
    await createSampleItem(db, bia, item({ name: "Da Bia" }));
    const mine = await querySampleItems(db, ana, "mine", everything);
    expect(mine.rows.map((row) => row.name)).toEqual(["Da Ana"]);
    expect((await querySampleItems(db, staff, "all", everything)).rows).toHaveLength(2);
    await expect(querySampleItems(db, ana, "all", everything)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("lets nobody read, change or delete another account's record", async () => {
    const ana = await viewer("ana@example.com");
    const bia = await viewer("bia@example.com");
    const theirs = await createSampleItem(db, bia, item());
    expect(await getSampleItem(db, ana, "mine", theirs.id)).toBeNull();
    expect(await getSampleItem(db, ana, "mine", "not-an-id")).toBeNull();
    await expect(
      updateSampleItem(db, ana, { id: theirs.id, seen: theirs.updatedAt, input: item() }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(deleteSampleItem(db, ana, theirs.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("the rules a sample item keeps", () => {
  it("refuses a code already on file in the same account, and allows it in another", async () => {
    const ana = await viewer("ana@example.com");
    const bia = await viewer("bia@example.com");
    await createSampleItem(db, ana, item({ code: "a-1" }));
    await expect(createSampleItem(db, ana, item({ code: "A-1" }))).rejects.toMatchObject({
      status: 409,
      key: "sampleItemCodeTaken",
    });
    await expect(createSampleItem(db, bia, item({ code: "A-1" }))).resolves.toMatchObject({
      code: "A-1",
    });
  });

  it("refuses a change over a version that is no longer the current one", async () => {
    const ana = await viewer("ana@example.com");
    const opened = await createSampleItem(db, ana, item());
    const saved = await updateSampleItem(db, ana, {
      id: opened.id,
      seen: opened.updatedAt,
      input: item({ name: "Mudado", dueDate: "2026-12-31" as IsoDate }),
    });
    expect([saved.name, saved.dueDate]).toEqual(["Mudado", "2026-12-31"]);
    await expect(
      updateSampleItem(db, ana, { id: opened.id, seen: opened.updatedAt, input: item() }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("the list of sample items", () => {
  it("searches without accents, filters by status and pages without repeating anyone", async () => {
    const ana = await viewer("ana@example.com");
    await createSampleItem(db, ana, item({ name: "Ação", code: "X-9" }));
    await createSampleItem(db, ana, item({ name: "Outro", status: "closed" }));
    const names = async (over: Partial<SampleItemsQuery>) =>
      (await querySampleItems(db, ana, "mine", { ...everything, ...over })).rows.map(
        (row) => row.name,
      );
    expect(await names({ q: "acao" })).toEqual(["Ação"]);
    expect(await names({ q: "x-9" })).toEqual(["Ação"]);
    expect(await names({ status: "closed" })).toEqual(["Outro"]);
    expect(await names({ q: "ninguém" })).toEqual([]);
    await Promise.all(
      Array.from({ length: 23 }, (_, index) =>
        createSampleItem(db, ana, item({ name: `Igual ${index % 2}` })),
      ),
    );
    const pages = await Promise.all(
      [1, 2].map((page) => querySampleItems(db, ana, "mine", { ...everything, page })),
    );
    const ids = pages.flatMap(({ rows }) => rows.map((row) => row.id));
    expect(new Set(ids).size).toBe(25);
  });
});
