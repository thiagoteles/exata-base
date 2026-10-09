import { describe, expect, it } from "vitest";
import { createPathMap, fillPath } from "./path-map";

const map = createPathMap({
  "/plans": "/planos",
  "/lotteries/[game]/results/[draw]": "/loterias/[game]/resultado/[draw]",
});

describe("path map", () => {
  it("translates a fixed address both ways", () => {
    expect(map.publicPathOf("/plans")).toBe("/planos");
    expect(map.internalPathOf("/planos")).toBe("/plans");
  });

  it("carries each dynamic segment across, one segment each", () => {
    expect(map.publicPathOf("/lotteries/mega-sena/results/2900")).toBe(
      "/loterias/mega-sena/resultado/2900",
    );
    expect(map.internalPathOf("/loterias/quina/resultado/12")).toBe("/lotteries/quina/results/12");
    expect(map.internalPathOf("/loterias/quina/resultado")).toBeNull();
    expect(map.internalPathOf("/loterias/quina/resultado/12/extra")).toBeNull();
  });

  it("leaves an address outside the map alone", () => {
    expect(map.publicPathOf("/account")).toBeNull();
    expect(map.internalPathOf("/plans")).toBeNull();
  });

  it("encodes values only when building a link", () => {
    expect(fillPath("/loterias/[game]", { game: "dupla sena" }, true)).toBe(
      "/loterias/dupla%20sena",
    );
    expect(fillPath("/loterias/[game]", { game: "dupla sena" }, false)).toBe(
      "/loterias/dupla sena",
    );
  });
});
