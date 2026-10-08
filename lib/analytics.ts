/*
 * Umami, with no SDK. The script is in the root layout only when UMAMI_WEBSITE_ID is set; without
 * it these functions do nothing. Only the account's internal id is ever sent: never an e-mail, a
 * name or anything a person typed.
 */

type EventData = Readonly<Record<string, string | number | boolean>>;
type Umami = { track: (event: string, data?: EventData) => void; identify: (id: string) => void };

function umami(): Umami | undefined {
  return (globalThis as { window?: { umami?: Umami } }).window?.umami;
}

export function track(event: string, data?: EventData): void {
  umami()?.track(event, data);
}

export function identify(accountId: string): void {
  umami()?.identify(accountId);
}
