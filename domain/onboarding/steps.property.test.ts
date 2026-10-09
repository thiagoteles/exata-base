import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { completeStep, onboardingProgress } from "./steps";

const steps = [{ id: "a" }, { id: "b" }, { id: "c", final: true as const }];

describe("onboarding progress", () => {
  it("starts at the first step with nothing done", () => {
    const progress = onboardingProgress(steps, []);
    expect(progress).toMatchObject({ doneCount: 0, total: 3, next: "a", complete: false });
    expect(progress.activated).toBe(false);
  });

  it("points at the first step still open, whatever order they were done in", () => {
    expect(onboardingProgress(steps, ["b"]).next).toBe("a");
    expect(onboardingProgress(steps, ["a", "c"]).next).toBe("b");
  });

  it("is activated by the final step alone and complete only with every step", () => {
    expect(onboardingProgress(steps, ["c"])).toMatchObject({ activated: true, complete: false });
    expect(onboardingProgress(steps, ["a", "b", "c"])).toMatchObject({
      complete: true,
      next: null,
    });
  });

  it("is never complete or activated when the product declares no steps", () => {
    expect(onboardingProgress([], ["a"])).toMatchObject({ complete: false, activated: false });
  });

  it("is never activated when no step is final", () => {
    expect(onboardingProgress([{ id: "a" }], ["a"]).activated).toBe(false);
  });
});

describe("completing a step", () => {
  it("adds it once and says activated only when the final one lands", () => {
    const first = completeStep(steps, [], "a");
    expect(first).toEqual({ done: ["a"], activatedNow: false });
    expect(completeStep(steps, first.done, "c")).toEqual({
      done: ["a", "c"],
      activatedNow: true,
    });
  });

  it("ignores a step that is not declared and one already done", () => {
    expect(completeStep(steps, ["a"], "nope")).toEqual({ done: ["a"], activatedNow: false });
    expect(completeStep(steps, ["a", "c"], "c")).toEqual({
      done: ["a", "c"],
      activatedNow: false,
    });
  });

  it("sends activation at most once however the steps arrive", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("a", "b", "c", "x")), (ids) => {
        let done: string[] = [];
        let sent = 0;
        for (const id of ids) {
          const result = completeStep(steps, done, id);
          ({ done } = result);
          sent += result.activatedNow ? 1 : 0;
        }
        expect(sent).toBeLessThanOrEqual(1);
        expect(sent === 1).toBe(done.includes("c"));
        expect(new Set(done).size).toBe(done.length);
      }),
    );
  });
});
