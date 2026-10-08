import { describe, expect, it } from "vitest";
import { askServices } from "./ask-services";
import type { Values } from "./integrations";

/** Answers the questions in order and remembers what was asked. */
function scripted(answers: string[]) {
  const asked: string[] = [];
  const rest = [...answers];
  return {
    asked,
    reader: {
      question: (text: string) => {
        asked.push(text);
        return Promise.resolve(rest.shift() ?? "");
      },
    },
  };
}

describe("the conversation about outside services", () => {
  it("asks nothing more when the person declines", async () => {
    const { reader, asked } = scripted(["n"]);
    const services: Values = {};
    await askServices(reader, () => undefined, services);
    expect(asked).toHaveLength(1);
    expect(services).toEqual({});
  });

  it("collects Clerk and Stripe, and skips what is declined", async () => {
    const { reader } = scripted([
      "y", // set up now
      "https://app.example.com", // address
      "y", // Clerk
      "pk_live_1",
      "sk_live_1",
      "", // webhook secret, later
      "n", // Stripe, then e-mail, storage and analytics (Google is not asked with Clerk)
      "n",
      "n",
      "n",
      "", // admin e-mails
      "", // contact e-mails
    ]);
    const services: Values = {};
    await askServices(reader, () => undefined, services);
    expect(services).toEqual({
      APP_URL: "https://app.example.com",
      AUTH_PROVIDER: "clerk",
      CLERK_PUBLISHABLE_KEY: "pk_live_1",
      CLERK_SECRET_KEY: "sk_live_1",
    });
  });

  it("asks again after a key with the wrong shape", async () => {
    const { reader } = scripted([
      "y",
      "https://app.example.com",
      "y",
      "sk_live_wrong", // publishable key wants pk_
      "pk_live_1",
      "sk_live_1",
      "",
      "n",
      "n",
      "n",
      "n",
      "",
      "",
    ]);
    const lines: string[] = [];
    const services: Values = {};
    await askServices(reader, (text) => lines.push(text), services);
    expect(lines.join("")).toContain("CLERK_PUBLISHABLE_KEY must start with pk_");
    expect(services["CLERK_PUBLISHABLE_KEY"]).toBe("pk_live_1");
  });

  it("keeps a stored secret on Enter without printing it", async () => {
    const { reader, asked } = scripted(["y", "", "y", "", "", "", "n", "n", "n", "n", "", ""]);
    const services: Values = {
      APP_URL: "https://app.example.com",
      AUTH_PROVIDER: "clerk",
      CLERK_PUBLISHABLE_KEY: "pk_live_1",
      CLERK_SECRET_KEY: "sk_live_secret",
    };
    await askServices(reader, () => undefined, services);
    expect(services["CLERK_SECRET_KEY"]).toBe("sk_live_secret");
    expect(asked.join("")).not.toContain("sk_live_secret");
  });
});
