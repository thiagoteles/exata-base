/*
 * What a person recognises a device by, taken from the browser's own description of itself. Only the
 * common browsers and systems are named; anything else is `null` and the screen says so in words.
 * The order of the checks matters: Edge and Opera also say Chrome, and Chrome also says Safari.
 */

export type DeviceDescription = { browser: string | null; system: string | null };

const browsers: readonly (readonly [string, RegExp])[] = [
  ["Edge", /\bEdg(?:e|A|iOS)?\//],
  ["Opera", /\bOPR\/|\bOpera\b/],
  ["Firefox", /\bFirefox\/|\bFxiOS\//],
  ["Chrome", /\bChrome\/|\bCriOS\//],
  ["Safari", /\bSafari\//],
];

const systems: readonly (readonly [string, RegExp])[] = [
  ["Android", /\bAndroid\b/],
  ["iOS", /\b(?:iPhone|iPad|iPod)\b/],
  ["Windows", /\bWindows\b/],
  ["macOS", /\bMac OS X\b|\bMacintosh\b/],
  ["Linux", /\bLinux\b|\bX11\b/],
];

function firstMatch(table: readonly (readonly [string, RegExp])[], text: string): string | null {
  return table.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export function describeDevice(userAgent: string | null | undefined): DeviceDescription {
  const text = userAgent ?? "";
  return { browser: firstMatch(browsers, text), system: firstMatch(systems, text) };
}
