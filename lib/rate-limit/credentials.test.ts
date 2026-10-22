import { describe, expect, it } from "vitest";
import { credentialAttemptFor, credentialSubjects } from "./credential-rules";

describe("credential attempt subjects", () => {
  it("counts the address and the e-mail, and ignores a blank e-mail", () => {
    expect(credentialSubjects("address:203.0.113.9", " Ana@Example.com ")).toEqual([
      "address:203.0.113.9",
      "email:ana@example.com",
    ]);
    expect(credentialSubjects("address:unknown", "  ")).toEqual(["address:unknown"]);
    expect(credentialSubjects("address:unknown", undefined)).toEqual(["address:unknown"]);
  });

  it("names a limit only for the paths that check a secret", () => {
    expect(credentialAttemptFor("/api/auth/sign-in/email")?.name).toBe("sign-in");
    expect(credentialAttemptFor("/api/auth/request-password-reset")?.name).toBe("password-reset");
    expect(credentialAttemptFor("/api/auth/two-factor/verify-totp")?.name).toBe("second-factor");
    expect(credentialAttemptFor("/api/auth/two-factor/verify-backup-code")?.name).toBe(
      "second-factor",
    );
    expect(credentialAttemptFor("/api/auth/sign-up/email")).toBeNull();
    expect(credentialAttemptFor("/api/auth/get-session")).toBeNull();
  });
});
