import { describe, expect, it } from "vitest";
import { claimVisitorValues } from "@/lib/preferences/claim";
import { readPreferences, savePreference } from "@/lib/preferences/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const draft = { subject: "support", body: "Preciso de ajuda com o meu plano." };

describe("claiming what a visitor kept in the browser", () => {
  it("saves it to an account that has nothing of the kind, and reports it handled", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await claimVisitorValues(db, ana.id, { contactDraft: draft })).toEqual(["contactDraft"]);
    expect((await readPreferences(db, ana.id)).contactDraft).toEqual(draft);
  });

  it("leaves what the account already had, and still reports the key handled so the browser forgets it", async () => {
    const ana = await createUser(db, "ana@example.com");
    const earlier = { subject: "billing", body: "Rascunho que já estava na conta." };
    await savePreference(db, ana.id, "contactDraft", earlier);
    expect(await claimVisitorValues(db, ana.id, { contactDraft: draft })).toEqual(["contactDraft"]);
    expect((await readPreferences(db, ana.id)).contactDraft).toEqual(earlier);
  });

  it("drops what does not fit, reporting it handled, and saves nothing", async () => {
    const ana = await createUser(db, "ana@example.com");
    for (const garbage of [
      "texto solto",
      7,
      { subject: "x" },
      { subject: "", body: "x".repeat(5001) },
    ]) {
      expect(await claimVisitorValues(db, ana.id, { contactDraft: garbage })).toEqual([
        "contactDraft",
      ]);
    }
    expect((await readPreferences(db, ana.id)).contactDraft).toBeNull();
  });

  it("ignores keys nobody declared, and preferences that belong in cookies", async () => {
    const ana = await createUser(db, "ana@example.com");
    const handled = await claimVisitorValues(db, ana.id, {
      theme: "dark",
      fontScale: "larger",
      nope: "x",
      __proto__: { contactDraft: draft },
    });
    expect(handled).toEqual([]);
    const after = await readPreferences(db, ana.id);
    expect(after.theme).toBe("system");
    expect(after.fontScale).toBe("default");
  });

  it("is the same the second time, and claims for the person it is asked to claim for", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await claimVisitorValues(db, ana.id, { contactDraft: draft });
    await claimVisitorValues(db, ana.id, { contactDraft: draft });
    expect((await readPreferences(db, ana.id)).contactDraft).toEqual(draft);
    expect((await readPreferences(db, bia.id)).contactDraft).toBeNull();
  });
});
