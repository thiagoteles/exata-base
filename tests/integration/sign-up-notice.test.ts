import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyAdminsOfSignUp } from "@/lib/accounts/sign-up-notice";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const outbox = vi.hoisted(() => ({
  messages: [] as { to: string | string[]; category: string; subject: string; text: string }[],
}));

// Only the delivery is replaced: the message is built and rendered for real.
vi.mock("@/lib/ports/email", () => ({
  sendEmail: (message: {
    to: string | string[];
    category: string;
    subject: string;
    text: string;
  }) => {
    outbox.messages.push(message);
    return Promise.resolve("sent");
  },
}));

beforeEach(() => {
  outbox.messages.length = 0;
});

describe("the notice of a new account", () => {
  it("goes to every admin address at once, as the team's own mail, with the account and the count", async () => {
    await createUser(db, "first@example.com");
    const ana = await createUser(db, "ana@example.com");

    expect(await notifyAdminsOfSignUp(db, ana.id, ["one@team.com", "two@team.com"])).toBe("sent");
    expect(outbox.messages).toHaveLength(1);
    const [message] = outbox.messages;
    expect(message?.to).toEqual(["one@team.com", "two@team.com"]);
    expect(message?.category).toBe("transactional");
    expect(message?.subject).toBe("Novo cadastro: ana@example.com");
    expect(message?.text).toContain("Agora são 2 contas.");
    expect(message?.text).toContain(`/admin/users/${ana.id}`);
  });

  it("writes to nobody without admin addresses, or when the account is already gone", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await notifyAdminsOfSignUp(db, ana.id, [])).toBeNull();
    expect(
      await notifyAdminsOfSignUp(db, "00000000-0000-4000-8000-000000000000", ["one@team.com"]),
    ).toBeNull();
    expect(outbox.messages).toHaveLength(0);
  });
});
