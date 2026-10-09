/* The compose's mail catcher. Tests read the messages the app sent, as a person would read their inbox. */

const MAILPIT = "http://localhost:47030/api/v1";
const POLL_MS = 500;
const POLL_TRIES = 30;
const verifyLink = /href="([^"]*(?:verify-email|reset-password)[^"]*)"/;

type Summary = { ID: string };

export async function linkSentTo(email: string): Promise<string> {
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    const search = (await (
      await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as { messages: Summary[] };
    const [latest] = search.messages;
    if (latest !== undefined) {
      const message = (await (await fetch(`${MAILPIT}/message/${latest.ID}`)).json()) as {
        HTML: string;
      };
      const match = verifyLink.exec(message.HTML);
      if (match?.[1] !== undefined) {
        return match[1].replaceAll("&amp;", "&");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`No e-mail with a link reached ${email}`);
}

type Message = { Subject: string; Text: string; HTML: string; To: { Address: string }[] };

/** Waits for a message to an address whose subject contains the given text, and returns it whole. */
export async function messageSentTo(email: string, subjectPart: string): Promise<Message> {
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    const search = (await (
      await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as {
      messages: (Summary & { Subject: string })[];
    };
    const found = search.messages.find((message) => message.Subject.includes(subjectPart));
    if (found !== undefined) {
      return (await (await fetch(`${MAILPIT}/message/${found.ID}`)).json()) as Message;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`No message to ${email} with "${subjectPart}" in its subject`);
}
