import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { type NewMessage, submitContact } from "@/lib/contact/service";
import { contactMessages } from "@/lib/db/schema/contact";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

const message = (over: Partial<NewMessage> = {}): NewMessage => ({
  name: "Ana Souza",
  email: "ana@example.com",
  subject: "support",
  body: "Não consigo baixar meus dados.",
  ...over,
});

describe("submitting the contact form", () => {
  it("points a signed-in person's message at their row and their account e-mail", async () => {
    const ana = await createUser(db, "ana@example.com", "member");
    const stored = await submitContact(
      db,
      message({ email: "outro@example.com" }),
      { id: ana.id, email: ana.email },
      () => Promise.resolve(true),
    );
    expect(stored).toMatchObject({ userId: ana.id, email: "ana@example.com" });
  });

  it("keeps the language the sender was using, and the default when not told", async () => {
    const told = await submitContact(db, message({ locale: "en-US" }), null, () =>
      Promise.resolve(true),
    );
    const silent = await submitContact(db, message(), null, () => Promise.resolve(true));
    expect(told.locale).toBe("en-US");
    expect(silent.locale).toBe("pt-BR");
  });

  it("keeps a visitor's message with what they typed, lowercased, and no owner", async () => {
    const stored = await submitContact(db, message({ email: "Visitante@Example.com" }), null, () =>
      Promise.resolve(true),
    );
    expect(stored).toMatchObject({ userId: null, email: "visitante@example.com" });
  });

  it("stores the message before telling the team, and a failed notice loses nothing", async () => {
    const calls: string[] = [];
    const notify = (row: { id: string }) => {
      calls.push(row.id);
      return Promise.reject(new Error("mail is down"));
    };
    const stored = await submitContact(db, message(), null, notify);
    expect(calls).toEqual([stored.id]);
    expect(await db.select().from(contactMessages)).toHaveLength(1);
  });

  it("is deleted with the account of the person who wrote it", async () => {
    const ana = await createUser(db, "ana@example.com", "member");
    await submitContact(db, message(), { id: ana.id, email: ana.email }, () =>
      Promise.resolve(true),
    );
    await db.delete(users).where(eq(users.id, ana.id));
    expect(await db.select().from(contactMessages)).toEqual([]);
  });
});
