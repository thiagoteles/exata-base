import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REMINDER_WINDOW_DAYS } from "@/domain/billing/abandonment";
import { checkoutSessions } from "@/lib/db/schema/billing";
import { savePreference } from "@/lib/preferences/service";
import { remindAbandonedCheckouts } from "@/lib/scheduled/abandoned-checkouts";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const outbox = vi.hoisted(() => ({ to: [] as string[], subjects: [] as string[], fail: false }));

// The real e-mail rules decide who may be written to; only the delivery is replaced.
vi.mock("@/lib/ports/email", async () => {
  const { allowedRecipients } = await import("@/lib/ports/email/consent");
  const { testDatabase: database } = await import("./database");
  return {
    sendEmail: async (message: {
      to: string | string[];
      category: "reminder";
      subject: string;
    }) => {
      if (outbox.fail) {
        return "failed";
      }
      const recipients = await allowedRecipients(database(), message);
      if (recipients.length === 0) {
        return "declined";
      }
      outbox.to.push(...recipients);
      outbox.subjects.push(message.subject);
      return "sent";
    },
  };
});

const DAY = 86_400_000;
const now = new Date("2026-10-09T12:00:00Z");
let counter = 0;

async function expiredCheckout(
  email: string,
  daysAgo: number,
  status: "expired" | "open" = "expired",
) {
  const person = await createUser(db, email);
  await addCheckout(person.id, daysAgo, status);
  return person;
}

async function addCheckout(
  userId: string,
  daysAgo: number,
  status: "expired" | "open" = "expired",
) {
  counter += 1;
  await db.insert(checkoutSessions).values({
    userId,
    provider: "stripe",
    providerSessionId: `cs_${counter}`,
    interval: "monthly",
    source: "plans",
    status,
    closedAt: status === "expired" ? new Date(now.getTime() - daysAgo * DAY) : null,
  });
}

beforeEach(() => {
  outbox.to.length = 0;
  outbox.subjects.length = 0;
  outbox.fail = false;
});

describe("the reminder about an abandoned checkout", () => {
  it("goes once to someone whose checkout expired recently, and never again", async () => {
    await expiredCheckout("ana@example.com", 1);
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 1,
      declined: 0,
      failed: 0,
    });
    expect(outbox.to).toEqual(["ana@example.com"]);
    expect(outbox.subjects).toEqual(["Seu plano ficou esperando"]);
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 0,
      declined: 0,
      failed: 0,
    });
    expect(outbox.to).toHaveLength(1);
  });

  it("sends one message to a person with several expired checkouts", async () => {
    const ana = await expiredCheckout("ana@example.com", 1);
    await addCheckout(ana.id, 2);
    await addCheckout(ana.id, 3);
    expect(await remindAbandonedCheckouts.run({ db, now })).toMatchObject({ sent: 1 });
    expect(outbox.to).toEqual(["ana@example.com"]);
  });

  it("leaves out an old checkout, one still open, and one already paid for another way", async () => {
    await expiredCheckout("old@example.com", REMINDER_WINDOW_DAYS + 1);
    await expiredCheckout("open@example.com", 0, "open");
    const { subscriber } = billingFixture(db);
    const paying = await subscriber("paid@example.com");
    await addCheckout(paying.id, 1);
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 0,
      declined: 0,
      failed: 0,
    });
    expect(outbox.to).toEqual([]);
  });

  it("respects a person who turned reminders off, and does not try again", async () => {
    const bia = await expiredCheckout("bia@example.com", 1);
    await savePreference(db, bia.id, "email", { reminders: false, news: false });
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 0,
      declined: 1,
      failed: 0,
    });
    expect(outbox.to).toEqual([]);
    await savePreference(db, bia.id, "email", { reminders: true, news: false });
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 0,
      declined: 0,
      failed: 0,
    });
  });

  it("gives the claim back when the e-mail fails, so the next run tries again", async () => {
    const carla = await expiredCheckout("carla@example.com", 1);
    outbox.fail = true;
    expect(await remindAbandonedCheckouts.run({ db, now })).toEqual({
      sent: 0,
      declined: 0,
      failed: 1,
    });
    expect(
      (await db.select().from(checkoutSessions).where(eq(checkoutSessions.userId, carla.id)))[0]
        ?.abandonedEmailAt,
    ).toBeNull();
    outbox.fail = false;
    expect(await remindAbandonedCheckouts.run({ db, now })).toMatchObject({ sent: 1 });
  });

  it("does not send twice when two runs arrive at the same time", async () => {
    await expiredCheckout("dani@example.com", 1);
    await Promise.all([
      remindAbandonedCheckouts.run({ db, now }),
      remindAbandonedCheckouts.run({ db, now }),
    ]);
    expect(outbox.to).toHaveLength(1);
  });
});
