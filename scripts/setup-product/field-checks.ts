/*
 * Shape checks for the answers to the setup questions. Each returns a complaint, or null when the
 * value is acceptable.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const startsWith = (prefix: string) => (value: string) =>
  value.startsWith(prefix) ? null : `must start with ${prefix}`;
export const email = (value: string) => (EMAIL.test(value) ? null : "must be an e-mail address");
export const emailList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .every((item) => email(item) === null)
    ? null
    : "must be a comma list of e-mail addresses";
export const url = (value: string) =>
  URL.canParse(value) ? null : "must be a full address, like https://example.com";
export const proxy = (value: string) =>
  value === "traefik" || value === "cloudflare" ? null : "must be traefik or cloudflare";
export const onOff = (value: string) =>
  value === "on" || value === "off" ? null : "must be on or off";
export const nonEmpty = (value: string) => (value.trim().length > 0 ? null : "cannot be empty");
export const digits = (value: string) => (DIGITS.test(value) ? null : "must be only digits");
export const uuid = (value: string) => (UUID.test(value) ? null : "must be a UUID");
export const serviceAccount = (value: string) => {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as {
      type?: string;
    };
    return parsed.type === "service_account"
      ? null
      : "must be the base64 of a service account JSON file";
  } catch {
    return "must be the base64 of a service account JSON file";
  }
};
