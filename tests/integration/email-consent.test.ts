import { describe, expect, it } from "vitest";
import { allowedRecipients } from "@/lib/ports/email/consent";
import { savePreference } from "@/lib/preferences/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

const reminder = (to: string | string[]) => allowedRecipients(db, { to, category: "reminder" });
const news = (to: string | string[]) => allowedRecipients(db, { to, category: "news" });
const transactional = (to: string | string[]) =>
  allowedRecipients(db, { to, category: "transactional" });

describe("who a message may reach", () => {
  it("sends what an account needs to anyone, with or without an account", async () => {
    await createUser(db, "ana@example.com");
    expect(await transactional(["ana@example.com", "stranger@example.com"])).toEqual([
      "ana@example.com",
      "stranger@example.com",
    ]);
  });

  it("sends reminders to a new account, and news to nobody who did not ask", async () => {
    await createUser(db, "ana@example.com");
    expect(await reminder("ana@example.com")).toEqual(["ana@example.com"]);
    expect(await news("ana@example.com")).toEqual([]);
  });

  it("leaves out an address that has no account, for anything but what an account needs", async () => {
    expect(await reminder("stranger@example.com")).toEqual([]);
    expect(await news("stranger@example.com")).toEqual([]);
  });

  it("follows what each person chose, and only for the person who chose", async () => {
    const ana = await createUser(db, "ana@example.com");
    await createUser(db, "bia@example.com");
    await savePreference(db, ana.id, "email", { reminders: false, news: true });
    expect(await reminder(["ana@example.com", "bia@example.com"])).toEqual(["bia@example.com"]);
    expect(await news(["ana@example.com", "bia@example.com"])).toEqual(["ana@example.com"]);
  });

  it("matches the address whatever its case, and keeps the case it was given", async () => {
    await createUser(db, "ana@example.com");
    expect(await reminder("Ana@Example.com")).toEqual(["Ana@Example.com"]);
  });

  it("refuses to save a choice that is not both of the two answers", async () => {
    const ana = await createUser(db, "ana@example.com");
    for (const value of [
      { reminders: true },
      { reminders: "yes", news: false },
      { reminders: true, news: false, other: 1 },
      true,
      null,
    ]) {
      await expect(savePreference(db, ana.id, "email", value)).rejects.toMatchObject({
        status: 400,
      });
    }
  });
});
