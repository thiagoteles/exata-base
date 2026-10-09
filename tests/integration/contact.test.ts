import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import {
  type ContactQuery,
  changeContactStatus,
  createContactMessage,
  getContact,
  type NewMessage,
  queryContacts,
  replyToContact,
  type Viewer,
} from "@/lib/contact/service";
import { staffAuditLog } from "@/lib/db/schema/audit";
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

const everything: ContactQuery = { q: "", status: null, sort: "date", dir: "desc", page: 1 };

async function asViewer(email: string, role: Viewer["role"]): Promise<Viewer & { email: string }> {
  const user = await createUser(db, email, role);
  return { id: user.id, role, email };
}

describe("who sees which message", () => {
  it("shows a member only what they wrote, and the staff the whole inbox", async () => {
    const ana = await asViewer("ana@example.com", "member");
    const bia = await asViewer("bia@example.com", "member");
    const staff = await asViewer("staff@example.com", "staff");
    await createContactMessage(db, message({ body: "Da Ana" }), ana.id);
    await createContactMessage(
      db,
      message({ name: "Bia", email: "bia@example.com", body: "Da Bia" }),
      bia.id,
    );
    await createContactMessage(
      db,
      message({ name: "Visitante", email: "v@example.com", body: "De um visitante" }),
      null,
    );

    const mine = await queryContacts(db, ana, "mine", everything);
    expect(mine.rows.map((row) => row.body)).toEqual(["Da Ana"]);
    const all = await queryContacts(db, staff, "all", everything);
    expect(all.rows).toHaveLength(3);
  });

  it("refuses the whole inbox to a member, whatever the page asks for", async () => {
    const ana = await asViewer("ana@example.com", "member");
    await expect(queryContacts(db, ana, "all", everything)).rejects.toMatchObject({ status: 403 });
    const row = await createContactMessage(db, message(), ana.id);
    await expect(getContact(db, ana, "all", row.id)).rejects.toMatchObject({ status: 403 });
  });

  it("answers a message that is not yours as if it did not exist", async () => {
    const ana = await asViewer("ana@example.com", "member");
    const bia = await asViewer("bia@example.com", "member");
    const staff = await asViewer("staff@example.com", "staff");
    const row = await createContactMessage(db, message(), bia.id);
    expect(await getContact(db, ana, "mine", row.id)).toBeNull();
    expect(await getContact(db, bia, "mine", row.id)).not.toBeNull();
    expect(await getContact(db, staff, "all", row.id)).not.toBeNull();
    // Staff reading their own scope sees only what they wrote, not the inbox.
    expect(await getContact(db, staff, "mine", row.id)).toBeNull();
  });
});

describe("the inbox list", () => {
  async function seed() {
    const staff = await asViewer("staff@example.com", "staff");
    await createContactMessage(db, message({ name: "Ana Souza", body: "primeiro" }), null);
    await createContactMessage(
      db,
      message({
        name: "Bruno Lima",
        email: "bruno@example.com",
        subject: "billing",
        body: "100% do valor",
      }),
      null,
    );
    const third = await createContactMessage(
      db,
      message({ name: "Camila", email: "camila@example.com", body: "terceiro" }),
      null,
    );
    await changeContactStatus(db, { id: staff.id, email: staff.email }, third.id, "archived");
    return staff;
  }

  it("filters by status and by search, and the search treats % and _ as plain characters", async () => {
    const staff = await seed();
    const archived = await queryContacts(db, staff, "all", { ...everything, status: "archived" });
    expect(archived.rows.map((row) => row.name)).toEqual(["Camila"]);

    const byName = await queryContacts(db, staff, "all", { ...everything, q: "bruno" });
    expect(byName.rows.map((row) => row.name)).toEqual(["Bruno Lima"]);

    expect((await queryContacts(db, staff, "all", { ...everything, q: "100%" })).rows).toHaveLength(
      1,
    );
    expect((await queryContacts(db, staff, "all", { ...everything, q: "%" })).rows).toHaveLength(1);
    expect((await queryContacts(db, staff, "all", { ...everything, q: "_" })).rows).toHaveLength(0);
  });

  it("finds a word whatever the accents and the case", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    await createContactMessage(
      db,
      message({ name: "José Antônio", body: "Não consigo entrar" }),
      null,
    );
    const found = async (q: string) =>
      (await queryContacts(db, staff, "all", { ...everything, q })).rows.length;
    expect(await found("jose")).toBe(1);
    expect(await found("ANTONIO")).toBe(1);
    expect(await found("nao consigo")).toBe(1);
    expect(await found("José")).toBe(1);
    expect(await found("maria")).toBe(0);
  });

  it("sorts both ways and pages without repeating or skipping a row", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    for (let index = 0; index < 25; index += 1) {
      await createContactMessage(
        db,
        message({ name: `Pessoa ${String(index).padStart(2, "0")}` }),
        null,
      );
    }
    const ascending = await queryContacts(db, staff, "all", {
      ...everything,
      sort: "name",
      dir: "asc",
    });
    expect(ascending.rows[0]?.name).toBe("Pessoa 00");
    expect(ascending.window).toMatchObject({ total: 25, pages: 2, from: 1, to: 20 });

    const first = await queryContacts(db, staff, "all", { ...everything, sort: "name", page: 1 });
    const second = await queryContacts(db, staff, "all", { ...everything, sort: "name", page: 2 });
    const ids = [...first.rows, ...second.rows].map((row) => row.id);
    expect(new Set(ids).size).toBe(25);
  });

  it("returns an empty page with a valid window when nothing matches", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    expect(await queryContacts(db, staff, "all", { ...everything, q: "nada" })).toMatchObject({
      rows: [],
      window: { total: 0, from: 0, to: 0 },
    });
  });
});

describe("working a message", () => {
  it("records every status change in the staff audit log, and ignores a change to the same status", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    const actor = { id: staff.id, email: staff.email };
    const row = await createContactMessage(db, message(), null);
    await changeContactStatus(db, actor, row.id, "in_progress");
    await changeContactStatus(db, actor, row.id, "in_progress");
    const entries = await db.select().from(staffAuditLog);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "contact.status.change",
      actorEmail: staff.email,
      targetId: row.id,
      details: { from: "new", to: "in_progress" },
    });
    await expect(
      changeContactStatus(db, actor, crypto.randomUUID(), "archived"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("sends the reply first, then records who answered, when, and the audit entry", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    const row = await createContactMessage(db, message(), null);
    const send = vi.fn(() => Promise.resolve(true));
    await replyToContact({
      db,
      actor: { id: staff.id, email: staff.email },
      id: row.id,
      body: "Está na página da conta.",
      send,
      now: new Date("2026-03-01T12:00:00Z"),
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ id: row.id }),
      "Está na página da conta.",
    );
    const [stored] = await db.select().from(contactMessages).where(eq(contactMessages.id, row.id));
    expect(stored).toMatchObject({
      status: "answered",
      replyBody: "Está na página da conta.",
      answeredBy: staff.id,
      answeredByEmail: staff.email,
    });
    expect(stored?.answeredAt).toEqual(new Date("2026-03-01T12:00:00Z"));
    expect((await db.select().from(staffAuditLog)).map((entry) => entry.action)).toEqual([
      "contact.reply",
    ]);
  });

  it("records nothing when the reply e-mail was not sent", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    const row = await createContactMessage(db, message(), null);
    await expect(
      replyToContact({
        db,
        actor: { id: staff.id, email: staff.email },
        id: row.id,
        body: "Oi",
        send: () => Promise.resolve(false),
        now: new Date(),
      }),
    ).rejects.toThrow("not sent");
    const [stored] = await db.select().from(contactMessages).where(eq(contactMessages.id, row.id));
    expect(stored).toMatchObject({ status: "new", replyBody: null, answeredBy: null });
    expect(await db.select().from(staffAuditLog)).toEqual([]);
  });

  it("lets two people answer at the same moment but sends only one e-mail", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    const actor = { id: staff.id, email: staff.email };
    const row = await createContactMessage(db, message(), null);
    let sent = 0;
    const send = async () => {
      sent += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
      return true;
    };
    const results = await Promise.allSettled([
      replyToContact({ db, actor, id: row.id, body: "Primeira", send, now: new Date() }),
      replyToContact({ db, actor, id: row.id, body: "Segunda", send, now: new Date() }),
    ]);
    expect(sent).toBe(1);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
  });

  it("keeps the answer's author as an e-mail after that person's account is deleted", async () => {
    const staff = await asViewer("staff@example.com", "staff");
    const row = await createContactMessage(db, message(), null);
    await replyToContact({
      db,
      actor: { id: staff.id, email: staff.email },
      id: row.id,
      body: "Oi",
      send: () => Promise.resolve(true),
      now: new Date(),
    });
    await db.delete(users).where(eq(users.id, staff.id));
    const [stored] = await db.select().from(contactMessages).where(eq(contactMessages.id, row.id));
    expect(stored).toMatchObject({
      answeredBy: null,
      answeredByEmail: staff.email,
      replyBody: "Oi",
    });
  });
});
