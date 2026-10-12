import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createPathMap } from "./path-map";

const map = createPathMap({
  "/lotteries/[game]/results/[draw]": "/loterias/[game]/resultado/[draw]",
});
const segment = fc.stringMatching(/^[a-z0-9-]{1,20}$/);

describe("path map, for any segment values", () => {
  it("comes back to the same route address after a round trip", () => {
    fc.assert(
      fc.property(segment, segment, (game, draw) => {
        const route = `/lotteries/${game}/results/${draw}`;
        const visible = map.publicPathOf(route);
        expect(visible).toBe(`/loterias/${game}/resultado/${draw}`);
        expect(map.internalPathOf(visible ?? "")).toBe(route);
      }),
    );
  });
});
