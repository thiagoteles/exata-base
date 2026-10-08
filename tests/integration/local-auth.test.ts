import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, seedDatabase } from "@/lib/db/seed";
import { createLocalAuth, setPasswordIfMissing } from "@/lib/ports/auth/adapters/local";
import { testDatabase } from "./database";

const db = testDatabase();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function localAuth() {
  const sent: { to: string; url: string }[] = [];
  const capture = ({ to, url }: { to: string; url: string }) => {
    sent.push({ to, url });
    return Promise.resolve();
  };
  const auth = createLocalAuth({
    db,
    appUrl: "http://localhost:3300",
    secret: "test-secret-with-enough-length-0123456789",
    adminEmails: ["boss@example.com"],
    sendVerificationEmail: capture,
    sendResetPasswordEmail: capture,
  });
  return { auth, sent };
}

const signUp = { email: "Boss@Example.com", password: "a-long-password", name: "Boss" };

describe("local auth", () => {
  it("stores a lowercase e-mail, a uuid and a free plan, and sends the confirmation", async () => {
    const { auth, sent } = localAuth();
    await auth.api.signUpEmail({ body: signUp });
    const [user] = await db.select().from(users);
    expect(user).toMatchObject({ email: "boss@example.com", role: "member", emailVerified: false });
    expect(user?.id).toMatch(uuid);
    expect(
      await db
        .select()
        .from(plans)
        .where(eq(plans.userId, user?.id ?? "")),
    ).toHaveLength(1);
    expect(sent.map(({ to }) => to)).toEqual(["boss@example.com"]);
  });

  it("refuses sign-in until the e-mail is confirmed, and promotes on confirmation", async () => {
    const { auth, sent } = localAuth();
    await auth.api.signUpEmail({ body: signUp });
    await expect(
      auth.api.signInEmail({ body: { email: signUp.email, password: signUp.password } }),
    ).rejects.toThrow();

    const token = new URL(sent[0]?.url ?? "").searchParams.get("token") ?? "";
    await auth.api.verifyEmail({ query: { token } });

    const [user] = await db.select().from(users);
    expect(user).toMatchObject({ emailVerified: true, role: "admin" });
    const session = await auth.api.signInEmail({
      body: { email: signUp.email, password: signUp.password },
    });
    expect(session.user.email).toBe("boss@example.com");
  });

  it("refuses a wrong password", async () => {
    const { auth, sent } = localAuth();
    await auth.api.signUpEmail({ body: signUp });
    await auth.api.verifyEmail({
      query: { token: new URL(sent[0]?.url ?? "").searchParams.get("token") ?? "" },
    });
    await expect(
      auth.api.signInEmail({ body: { email: signUp.email, password: "not-the-password" } }),
    ).rejects.toThrow();
  });

  it("lets the seeded admin sign in with the known password, without signing up", async () => {
    const { auth } = localAuth();
    const adminId = await seedDatabase(db);
    await setPasswordIfMissing(db, adminId, SEED_ADMIN_PASSWORD);
    await setPasswordIfMissing(db, adminId, "a-different-password");
    const session = await auth.api.signInEmail({
      body: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD },
    });
    expect(session.user.id).toBe(adminId);
  });
});
