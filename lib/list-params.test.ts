import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pageWindow } from "./list-params";

describe("page window", () => {
  it("reads the position the way the list shows it", () => {
    expect(pageWindow(3, 312, 20)).toEqual({
      page: 3,
      pages: 16,
      offset: 40,
      from: 41,
      to: 60,
      total: 312,
    });
    expect(pageWindow(16, 312, 20)).toMatchObject({ from: 301, to: 312 });
  });

  it("stays valid for an empty list and for a page that does not exist", () => {
    expect(pageWindow(1, 0)).toMatchObject({ pages: 1, from: 0, to: 0 });
    expect(pageWindow(99, 45, 20)).toMatchObject({ page: 3, from: 41, to: 45 });
    expect(pageWindow(-4, 45, 20)).toMatchObject({ page: 1, from: 1, to: 20 });
  });

  it("splits any list into pages that cover every row once and never overlap", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 60 }),
        (total, size) => {
          const { pages } = pageWindow(1, total, size);
          let covered = 0;
          for (let page = 1; page <= pages; page += 1) {
            const window = pageWindow(page, total, size);
            expect(window.offset).toBe(covered);
            covered += window.to === 0 ? 0 : window.to - window.from + 1;
          }
          expect(covered).toBe(total);
        },
      ),
    );
  });
});
