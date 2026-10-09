import { describe, expect, it } from "vitest";
import { finishOnboardingStep, readOnboarding } from "@/lib/onboarding/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

describe("the first steps of an account", () => {
  it("start empty, point at the first step, and remember what was finished", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await readOnboarding(db, ana.id)).toMatchObject({ doneCount: 0, next: "look" });
    const { progress } = await finishOnboardingStep(db, ana.id, "look");
    expect(progress).toMatchObject({ doneCount: 1, next: "email" });
    expect(await readOnboarding(db, ana.id)).toMatchObject({ doneCount: 1 });
  });

  it("say activated on the one call that finishes the final step, and never again", async () => {
    const bia = await createUser(db, "bia@example.com");
    expect((await finishOnboardingStep(db, bia.id, "email")).activatedNow).toBe(false);
    expect((await finishOnboardingStep(db, bia.id, "invite")).activatedNow).toBe(true);
    const again = await finishOnboardingStep(db, bia.id, "invite");
    expect(again.activatedNow).toBe(false);
    expect(again.progress.doneCount).toBe(2);
  });

  it("ignore a step the product does not declare", async () => {
    const caio = await createUser(db, "caio@example.com");
    const { progress } = await finishOnboardingStep(db, caio.id, "made-up");
    expect(progress.doneCount).toBe(0);
  });
});
