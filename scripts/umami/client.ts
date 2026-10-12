/*
 * A thin client for the Umami API. A self-hosted server signs in with a user and a password and
 * answers with a bearer token; Umami Cloud takes an API key instead. Every call returns the parsed
 * JSON, and a refusal throws with Umami's own message, which names the field that was wrong.
 */

const trailingSlashes = /\/+$/;

export type UmamiCredentials =
  | { url: string; username: string; password: string }
  | { url: string; apiKey: string };

export type UmamiClient = {
  url: string;
  call: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>;
};

export function createUmamiClient(
  credentials: UmamiCredentials,
  send: typeof globalThis.fetch = globalThis.fetch,
): UmamiClient {
  const url = credentials.url.replace(trailingSlashes, "");
  let token: string | null = null;

  async function headers(): Promise<Record<string, string>> {
    if ("apiKey" in credentials) {
      return { "x-umami-api-key": credentials.apiKey };
    }
    if (token === null) {
      const response = await send(`${url}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: credentials.username, password: credentials.password }),
      });
      if (!response.ok) {
        throw new Error(`Umami refused the sign-in (${response.status}): ${await response.text()}`);
      }
      ({ token } = (await response.json()) as { token: string });
    }
    return { authorization: `Bearer ${token}` };
  }

  return {
    url,
    async call<T>(method: string, path: string, body?: unknown): Promise<T> {
      const response = await send(`${url}${path.startsWith("/") ? path : `/${path}`}`, {
        method,
        headers: {
          ...(await headers()),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${method} ${path} answered ${response.status}: ${text.slice(0, 2000)}`);
      }
      if (text.trimStart().startsWith("<")) {
        // Umami serves its app page for any path it has no API route for.
        throw new Error(`${method} ${path} is not an API route on this Umami`);
      }
      return (text === "" ? null : JSON.parse(text)) as T;
    },
  };
}
