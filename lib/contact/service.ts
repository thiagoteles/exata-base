import { and, asc, count, desc, eq, or, type SQL } from "drizzle-orm";
import type { Actor } from "@/lib/accounts/actor";
import { recordStaffWrite } from "@/lib/accounts/audit";
import { hasRole, type Role } from "@/lib/accounts/roles";
import type { Database } from "@/lib/db/database";
import { contactMessages } from "@/lib/db/schema/contact";
import { contains } from "@/lib/db/search";
import { DomainError } from "@/lib/errors";
import { type PageWindow, pageWindow } from "@/lib/list-params";

/*
 * The contact messages. Who sees what is decided here, once: the staff and admin see every
 * message, a member sees only the ones they wrote. Every function that reads takes the viewer and a
 * scope, so a page cannot forget to filter.
 */

export type ContactRow = typeof contactMessages.$inferSelect;
export type ContactStatus = ContactRow["status"];
type ContactSubject = ContactRow["subject"];

export type Viewer = { id: string; role: Role };

/** `mine` is the messages a person wrote; `all` is the whole inbox and needs the staff role. */
export type Scope = "mine" | "all";

function visibility(viewer: Viewer, scope: Scope): SQL | undefined {
  if (scope === "mine") {
    return eq(contactMessages.userId, viewer.id);
  }
  if (!hasRole(viewer.role, "staff")) {
    throw new DomainError(403);
  }
  return undefined;
}

export type NewMessage = {
  name: string;
  email: string;
  subject: ContactSubject;
  body: string;
  /** The language the sender was using; the default when not told. */
  locale?: string;
};

export async function createContactMessage(
  db: Database,
  input: NewMessage,
  userId: string | null,
): Promise<ContactRow> {
  const [row] = await db
    .insert(contactMessages)
    .values({ ...input, email: input.email.toLowerCase(), userId })
    .returning();
  if (row === undefined) {
    throw new Error("contact message was not stored");
  }
  return row;
}

export type ContactQuery = {
  q: string;
  status: ContactStatus | null;
  sort: "date" | "name" | "subject" | "status";
  dir: "asc" | "desc";
  page: number;
};

const sortColumns = {
  date: contactMessages.createdAt,
  name: contactMessages.name,
  subject: contactMessages.subject,
  status: contactMessages.status,
} as const;

export async function queryContacts(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  { q, status, sort, dir, page }: ContactQuery,
): Promise<{ rows: ContactRow[]; window: PageWindow }> {
  const term = q.trim();
  const where = and(
    visibility(viewer, scope),
    status === null ? undefined : eq(contactMessages.status, status),
    term === ""
      ? undefined
      : or(
          contains(contactMessages.name, term),
          contains(contactMessages.email, term),
          contains(contactMessages.body, term),
        ),
  );

  const [{ total = 0 } = {}] = await db
    .select({ total: count() })
    .from(contactMessages)
    .where(where);
  const window = pageWindow(page, total);
  const order = dir === "asc" ? asc(sortColumns[sort]) : desc(sortColumns[sort]);
  const rows = await db
    .select()
    .from(contactMessages)
    // The id makes the order total, so a page boundary never repeats or skips a row.
    .where(where)
    .orderBy(order, desc(contactMessages.id))
    .limit(window.to === 0 ? 1 : window.to - window.from + 1)
    .offset(window.offset);
  return { rows: window.total === 0 ? [] : rows, window };
}

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One message, or null when it does not exist or is not the viewer's to see. */
export async function getContact(
  db: Database,
  viewer: Viewer,
  scope: Scope,
  id: string,
): Promise<ContactRow | null> {
  const allowed = visibility(viewer, scope);
  // An address that is not an id names no message; it must not reach the database as a bad cast.
  if (!uuidShape.test(id)) {
    return null;
  }
  const [row] = await db
    .select()
    .from(contactMessages)
    .where(and(eq(contactMessages.id, id), allowed));
  return row ?? null;
}

export async function changeContactStatus(
  db: Database,
  actor: Actor,
  id: string,
  status: ContactStatus,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id))
      .for("update");
    if (current === undefined) {
      throw new DomainError(404);
    }
    if (current.status === status) {
      return;
    }
    await tx.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
    await recordStaffWrite(tx, actor, {
      action: "contact.status.change",
      targetTable: "contact_messages",
      targetId: id,
      details: { from: current.status, to: status },
    });
  });
}

type Reply = {
  db: Database;
  actor: Actor;
  id: string;
  body: string;
  /** Sends the reply e-mail; resolves to false when it was not sent. */
  send: (message: ContactRow, body: string) => Promise<boolean>;
  now?: Date;
};

/**
 * Answers a message, once. The message row stays locked while the e-mail goes out, so two people
 * answering at the same moment cannot both send: the second waits, finds a reply, and is refused.
 * If the e-mail is not sent, nothing is recorded and the message stays unanswered.
 */
export async function replyToContact({
  db,
  actor,
  id,
  body,
  send,
  now = new Date(),
}: Reply): Promise<void> {
  await db.transaction(async (tx) => {
    const [message] = await tx
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id))
      .for("update");
    if (message === undefined) {
      throw new DomainError(404);
    }
    if (message.replyBody !== null) {
      throw new DomainError(409);
    }
    if (!(await send(message, body))) {
      throw new Error("the reply e-mail was not sent");
    }
    await tx
      .update(contactMessages)
      .set({
        replyBody: body,
        status: "answered",
        answeredAt: now,
        answeredBy: actor.id,
        answeredByEmail: actor.email,
      })
      .where(eq(contactMessages.id, id));
    await recordStaffWrite(tx, actor, {
      action: "contact.reply",
      targetTable: "contact_messages",
      targetId: id,
    });
  });
}

/**
 * Stores a message from the contact form and tells the team. A signed-in person's message points
 * at their row and always carries their account e-mail; a visitor's carries what they typed.
 * The message is stored before anyone is notified, and a failed notice never loses it.
 */
export async function submitContact(
  db: Database,
  input: NewMessage,
  sender: { id: string; email: string } | null,
  notify: (message: ContactRow) => Promise<boolean>,
): Promise<ContactRow> {
  const stored = await createContactMessage(
    db,
    sender === null ? input : { ...input, email: sender.email },
    sender?.id ?? null,
  );
  await notify(stored).catch(() => false);
  return stored;
}
