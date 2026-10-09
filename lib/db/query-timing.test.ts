import { describe, expect, it } from "vitest";
import { describeQuery } from "./query-timing";

describe("query names", () => {
  it("name a query by its command and main table", () => {
    expect(describeQuery('select "id", "email" from "users" where "users"."id" = $1').name).toBe(
      "select users",
    );
    expect(describeQuery('insert into "payments" ("amount_cents") values ($1)').name).toBe(
      "insert payments",
    );
    expect(describeQuery('update "plans" set "status" = $1').name).toBe("update plans");
    expect(describeQuery('delete from "rate_limits" where "expires_at" < $1').name).toBe(
      "delete rate_limits",
    );
    expect(describeQuery("with recent as (select 1) select * from recent").name).toBe(
      "select recent",
    );
    expect(describeQuery("select 1").name).toBe("select");
    expect(describeQuery("begin").name).toBe("begin");
  });

  it("keep the text on one line and short, with the placeholders and never the values", () => {
    const { text } = describeQuery(
      `select *\n  from "users"\n  where "email" = $1 ${"and true ".repeat(60)}`,
    );
    expect(text.startsWith('select * from "users" where "email" = $1')).toBe(true);
    expect(text).not.toContain("\n");
    expect(text.length).toBe(300);
  });
});
