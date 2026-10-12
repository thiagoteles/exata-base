import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import current from "../../ports.json" with { type: "json" };
import { portsFor, rewritePorts, validatePorts } from "./ports";

describe("local ports", () => {
  it("move together by the app port", () => {
    expect(portsFor(current.app)).toEqual(current);
    expect(portsFor(47_310)).toEqual({
      app: 47_310,
      database: 47_450,
      mail: 47_040,
      image: 47_409,
    });
  });

  it("accept only a round app port in the range", () => {
    expect(validatePorts(47_310)).toEqual([]);
    for (const wrong of [47_305, 3000, 49_000, Number.NaN]) {
      expect(validatePorts(wrong)).toHaveLength(1);
    }
  });

  it("rewrite every port where it stands alone, and nothing else", () => {
    const text = '- "47300:3000"\nAPP_URL: http://localhost:47300\n- "47440:5432"\nid 147300 stays';
    expect(rewritePorts(text, portsFor(47_300), portsFor(47_310))).toBe(
      '- "47310:3000"\nAPP_URL: http://localhost:47310\n- "47450:5432"\nid 147300 stays',
    );
  });

  it("are the ones the compose publishes", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");
    expect(compose).toContain(`"${current.app}:3000"`);
    expect(compose).toContain(`APP_URL: http://localhost:${current.app}`);
    expect(compose).toContain(`"${current.database}:5432"`);
    expect(compose).toContain(`"${current.mail}:8025"`);
  });
});
