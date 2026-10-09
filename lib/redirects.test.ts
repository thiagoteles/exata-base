import { describe, expect, it } from "vitest";
import { movedAddresses, type Redirect } from "./redirects";

function chainsIn(list: readonly Redirect[]): string[] {
  const sources = new Set(list.map((entry) => entry.source));
  return list
    .filter((entry) => sources.has(entry.destination) || entry.source === entry.destination)
    .map((entry) => `${entry.source} -> ${entry.destination}`);
}

describe("moved addresses", () => {
  it("never send a visitor through a chain or back where they came from", () => {
    expect(chainsIn(movedAddresses)).toEqual([]);
    expect(
      chainsIn([
        { source: "/a", destination: "/b" },
        { source: "/b", destination: "/c" },
        { source: "/d", destination: "/d" },
      ]),
    ).toEqual(["/a -> /b", "/d -> /d"]);
  });
});
