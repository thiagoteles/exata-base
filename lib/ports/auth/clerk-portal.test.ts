import { describe, expect, it } from "vitest";
import { clerkProfileUrl } from "./clerk-portal";

const key = (host: string, kind = "test") =>
  `pk_${kind}_${Buffer.from(`${host}$`).toString("base64")}`;

describe("the Clerk account portal address", () => {
  it("follows from the publishable key of a development instance", () => {
    expect(clerkProfileUrl(key("calm-fox-12.clerk.accounts.dev"))).toBe(
      "https://calm-fox-12.accounts.dev/user",
    );
  });

  it("follows from the publishable key of a production instance", () => {
    expect(clerkProfileUrl(key("clerk.example.com", "live"))).toBe(
      "https://accounts.example.com/user",
    );
  });

  it("is null when there is no key or it does not carry a host", () => {
    expect(clerkProfileUrl(undefined)).toBeNull();
    expect(clerkProfileUrl("pk_test_")).toBeNull();
    expect(clerkProfileUrl("pk_test_!!!")).toBeNull();
    expect(clerkProfileUrl(key("example.com"))).toBeNull();
  });
});
