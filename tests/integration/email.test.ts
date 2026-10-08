import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSmtpSender } from "@/lib/ports/email/adapters/smtp";

/* The local destination, against the same Mailpit image the compose runs. */

const SMTP_PORT = 1025;
const API_PORT = 8025;
let mailpit: StartedTestContainer;

beforeAll(async () => {
  mailpit = await new GenericContainer("axllent/mailpit:v1.31")
    .withExposedPorts(SMTP_PORT, API_PORT)
    .withWaitStrategy(Wait.forHttp("/api/v1/info", API_PORT))
    .start();
});

afterAll(async () => {
  await mailpit.stop();
});

describe("SMTP to Mailpit", () => {
  it("delivers the message with its subject, both bodies and the sender", async () => {
    const host = mailpit.getHost();
    const sender = createSmtpSender(
      `smtp://${host}:${mailpit.getMappedPort(SMTP_PORT)}`,
      "no-reply@app.local",
    );
    await sender.send({
      to: "ana@example.com",
      subject: "Convite",
      html: "<p>Olá</p>",
      text: "Olá",
    });

    const api = `http://${host}:${mailpit.getMappedPort(API_PORT)}/api/v1`;
    const list = (await (await fetch(`${api}/messages`)).json()) as {
      messages: { ID: string; Subject: string }[];
    };
    expect(list.messages.map(({ Subject }) => Subject)).toEqual(["Convite"]);

    const message = (await (await fetch(`${api}/message/${list.messages[0]?.ID}`)).json()) as {
      From: { Address: string };
      To: { Address: string }[];
      HTML: string;
      Text: string;
    };
    expect(message.From.Address).toBe("no-reply@app.local");
    expect(message.To.map(({ Address }) => Address)).toEqual(["ana@example.com"]);
    expect(message.HTML).toContain("<p>Olá</p>");
    expect(message.Text.trim()).toBe("Olá");
  });
});
