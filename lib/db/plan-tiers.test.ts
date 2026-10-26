import { describe, expect, it } from "vitest";
import { addTierStatements, tiersInMigrations } from "./plan-tiers";

describe("the tiers the migrations add", () => {
  // Fails when db:tiers stops reading what it wrote before, and writes the same tiers again.
  it("are the base's two plus every tier a migration in the form db:tiers writes adds", () => {
    const written = addTierStatements(["plus", "team"]);
    expect([...tiersInMigrations(["CREATE TABLE x (id int);", written])].sort()).toEqual([
      "free",
      "paid",
      "plus",
      "team",
    ]);
  });
});
