import { describe, expect, it } from "vitest";
import { planReports, standardReports } from "./reports";

const wanted = standardReports("BRL");

describe("the Umami report plan", () => {
  it("creates every standard report on an empty website", () => {
    const plan = planReports([], wanted);
    expect(plan.create.map((report) => report.name)).toEqual(wanted.map((report) => report.name));
    expect(plan.update).toEqual([]);
  });

  it("keeps what matches, corrects what drifted and leaves hand-made reports alone", () => {
    const [full, purchase, ...rest] = wanted;
    if (full === undefined || purchase === undefined) {
      throw new Error("the standard reports changed");
    }
    const existing = [
      { ...full, id: "r1" },
      { ...purchase, id: "r2", parameters: { window: 60, steps: [] } },
      { id: "r3", type: "funnel", name: "Feito à mão", description: "", parameters: {} },
    ];
    const plan = planReports(existing, wanted);
    expect(plan.keep).toEqual([full.name]);
    expect(plan.update).toEqual([{ ...purchase, id: "r2" }]);
    expect(plan.create.map((report) => report.name)).toEqual(rest.map((report) => report.name));
  });

  it("treats parameters stored with their keys reordered as unchanged", () => {
    const [full] = wanted;
    if (full === undefined) {
      throw new Error("the standard reports changed");
    }
    const stored = {
      ...full,
      id: "r1",
      parameters: { steps: full.parameters["steps"], window: full.parameters["window"] },
    };
    expect(planReports([stored], [full]).keep).toEqual([full.name]);
  });

  it("builds the full funnel from the catalog, in order", () => {
    expect(wanted[0]?.parameters["steps"]).toEqual([
      { type: "event", value: "signup_completed" },
      { type: "event", value: "activated" },
      { type: "event", value: "paywall_viewed" },
      { type: "event", value: "checkout_started" },
      { type: "event", value: "payment_confirmed" },
    ]);
  });
});
