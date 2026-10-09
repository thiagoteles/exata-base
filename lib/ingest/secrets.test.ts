import { describe, expect, it } from "vitest";
import { parseIngestSecrets } from "./secrets";

const secret = (letter: string) => letter.repeat(32);

describe("ingest secrets", () => {
  it("reads one secret per source, ignoring spaces and empty items", () => {
    expect(parseIngestSecrets(` job-run=${secret("a")} , prices=${secret("b")},`)).toEqual({
      "job-run": secret("a"),
      prices: secret("b"),
    });
    expect(parseIngestSecrets("")).toEqual({});
  });

  it("keeps an equals sign inside the secret", () => {
    expect(parseIngestSecrets(`x=${secret("a")}==`)).toEqual({ x: `${secret("a")}==` });
  });

  it("refuses a short secret, a bad name, a missing secret and a repeated source", () => {
    expect(() => parseIngestSecrets("job-run=short")).toThrow("at least 32 characters");
    expect(() => parseIngestSecrets(`Job_Run=${secret("a")}`)).toThrow("not a source name");
    expect(() => parseIngestSecrets("job-run")).toThrow("at least 32 characters");
    expect(() => parseIngestSecrets(`a=${secret("a")},a=${secret("b")}`)).toThrow(
      "more than one secret",
    );
  });
});
