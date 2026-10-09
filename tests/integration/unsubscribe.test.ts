import { describe, expect, it } from "vitest";
import { readPreferences, savePreference } from "@/lib/preferences/service";
import { applyUnsubscribe } from "@/lib/unsubscribe/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const emailOf = async (id: string) => (await readPreferences(db, id)).email;

describe("unsubscribing", () => {
  it("turns off reminders and leaves news as it was", async () => {
    const ana = await createUser(db, "ana@example.com");
    await savePreference(db, ana.id, "email", { reminders: true, news: true });
    await applyUnsubscribe(db, { address: "ana@example.com", category: "reminder" });
    expect(await emailOf(ana.id)).toEqual({ reminders: false, news: true });
  });

  it("turns off news and leaves reminders as they were", async () => {
    const ana = await createUser(db, "ana@example.com");
    await savePreference(db, ana.id, "email", { reminders: true, news: true });
    await applyUnsubscribe(db, { address: "ana@example.com", category: "news" });
    expect(await emailOf(ana.id)).toEqual({ reminders: true, news: false });
  });

  it("changes nothing the second time, and works for an account that never chose", async () => {
    const ana = await createUser(db, "ana@example.com");
    await applyUnsubscribe(db, { address: "ana@example.com", category: "reminder" });
    await applyUnsubscribe(db, { address: "ana@example.com", category: "reminder" });
    expect(await emailOf(ana.id)).toEqual({ reminders: false, news: false });
  });

  it("finds the account whatever the case of the address, and touches no one else", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    await applyUnsubscribe(db, { address: "Ana@Example.com", category: "reminder" });
    expect((await emailOf(ana.id)).reminders).toBe(false);
    expect((await emailOf(bia.id)).reminders).toBe(true);
  });

  it("does nothing, and says nothing, for an address with no account", async () => {
    const ana = await createUser(db, "ana@example.com");
    await expect(
      applyUnsubscribe(db, { address: "stranger@example.com", category: "news" }),
    ).resolves.toBeUndefined();
    expect(await emailOf(ana.id)).toEqual({ reminders: true, news: false });
  });
});
