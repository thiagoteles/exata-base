/*
 * One secret per ingest source, so a worker that leaks its secret exposes only its own source.
 * The variable is a comma-separated list of `source=secret` pairs.
 */

export const SOURCE_NAME = /^[a-z0-9-]{1,40}$/;
const MIN_SECRET_LENGTH = 32;

export type IngestSecrets = Readonly<Record<string, string>>;

/** Reads the variable's value, and throws a sentence saying what is wrong with it. */
export function parseIngestSecrets(value: string): IngestSecrets {
  const secrets = new Map<string, string>();
  for (const pair of value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")) {
    const at = pair.indexOf("=");
    const source = at < 0 ? pair : pair.slice(0, at);
    const secret = at < 0 ? "" : pair.slice(at + 1);
    if (!SOURCE_NAME.test(source)) {
      throw new Error(
        `"${source}" is not a source name: use lower-case letters, digits and hyphens`,
      );
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`The secret of "${source}" needs at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (secrets.has(source)) {
      throw new Error(`"${source}" has more than one secret`);
    }
    secrets.set(source, secret);
  }
  return Object.fromEntries(secrets);
}
