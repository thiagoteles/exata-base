/*
 * The only module allowed to read the system clock. An entry point (a page after connection(), an
 * action, a route, an auth callback) reads it once and passes the instant down; every rule below
 * receives the instant as a parameter, so a test can fix it and prerendering never touches it.
 */

export function currentInstant(): Date {
  return new Date();
}

export function currentEpochMs(): number {
  return Date.now();
}
