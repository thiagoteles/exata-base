import { describe, expect, it } from "vitest";
import { jobRunSource } from "./job-run";
import { joinSources } from "./sources";

describe("the ingest sources of the base and the product", () => {
  // Fails when a product's source silently takes the place of the base's under the same name.
  it("refuse a name both declare, naming it, and join the rest", () => {
    expect(() => joinSources({ "job-run": jobRunSource }, { "job-run": jobRunSource })).toThrow(
      "ingest sources declared twice: job-run",
    );
    expect(Object.keys(joinSources({ "job-run": jobRunSource }, { draws: jobRunSource }))).toEqual([
      "job-run",
      "draws",
    ]);
  });
});
