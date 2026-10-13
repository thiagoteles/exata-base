/*
 * Money as a person reads and types it, in a language. The text of an amount is built from the
 * whole number of minor units, never from a float, so a large amount keeps every digit. Reading is
 * strict: more digits after the separator than the currency has is not rounded, it is refused.
 */

import { type CurrencyCode, exponentOf } from "./currency";
import { type Money, money } from "./money";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(locale: string, currency: CurrencyCode): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  const cached = currencyFormatters.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const digits = exponentOf(currency);
  const created = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  currencyFormatters.set(key, created);
  return created;
}

/** The exact decimal text of an amount: 123456 BRL is `1234.56`, 1000 JPY is `1000`, -5 KWD is `-0.005`. */
export function decimalText(amount: Money): string {
  const digits = exponentOf(amount.currency);
  const sign = amount.minor < 0 ? "-" : "";
  const padded = String(Math.abs(amount.minor)).padStart(digits + 1, "0");
  if (digits === 0) {
    return `${sign}${padded}`;
  }
  return `${sign}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}

/** `123456` BRL in pt-BR is `R$ 1.234,56` and `1000` JPY is `JP¥ 1.000`: the language's own symbol and separators. */
export function formatMoney(amount: Money, locale: string): string {
  return currencyFormatter(locale, amount.currency).format(decimalText(amount) as `${number}`);
}

type Separators = { group: string; decimal: string };
const separatorCache = new Map<string, Separators>();

function separatorsOf(locale: string): Separators {
  const cached = separatorCache.get(locale);
  if (cached !== undefined) {
    return cached;
  }
  const parts = new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: 1,
  }).formatToParts(1_000_000.5);
  const found: Separators = {
    group: parts.find((part) => part.type === "group")?.value ?? "",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
  separatorCache.set(locale, found);
  return found;
}

const SPACES = /[\s  ]/g;
const IS_SPACE = /\s/;
const MINUS_SIGNS = ["-", "−"];

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function symbolOf(locale: string, currency: CurrencyCode): string {
  const part = currencyFormatter(locale, currency)
    .formatToParts(1)
    .find((candidate) => candidate.type === "currency");
  return part?.value ?? currency;
}

function stripToken(text: string, token: string): string {
  if (token === "") {
    return text;
  }
  if (text.startsWith(token)) {
    return text.slice(token.length);
  }
  return text.endsWith(token) ? text.slice(0, -token.length) : text;
}

/**
 * Reads what a person typed as an amount in a currency and language: `1.234,56`, `R$ 1.234,56` and
 * `-1.234,56` in pt-BR. Returns null for anything else, including more digits after the separator
 * than the currency has and a group of digits that is not three wide.
 */
export function parseMoney(input: string, currency: CurrencyCode, locale: string): Money | null {
  const { group, decimal } = separatorsOf(locale);
  let text = input.replace(SPACES, "");
  let negative = false;
  const takeSign = () => {
    const sign = MINUS_SIGNS.find((candidate) => text.startsWith(candidate));
    if (sign !== undefined) {
      negative = true;
      text = text.slice(sign.length);
    }
  };
  takeSign();
  text = stripToken(stripToken(text, symbolOf(locale, currency)), currency);
  if (!negative) {
    takeSign();
  }
  const separator = escapeForPattern(decimal);
  const grouping = group === "" || IS_SPACE.test(group) ? "" : escapeForPattern(group);
  const grouped = grouping === "" ? "" : `\\d{1,3}(?:${grouping}\\d{3})+|`;
  const shape = new RegExp(`^(${grouped}\\d+)(?:${separator}(\\d+))?$`);
  const match = shape.exec(text);
  const whole = match?.[1];
  if (match === null || whole === undefined) {
    return null;
  }
  const fraction = match[2] ?? "";
  const digits = exponentOf(currency);
  if (fraction.length > digits) {
    return null;
  }
  const wholeDigits = grouping === "" ? whole : whole.split(group).join("");
  const minor = Number(`${wholeDigits}${fraction.padEnd(digits, "0")}`);
  if (!Number.isSafeInteger(minor)) {
    return null;
  }
  return money(negative && minor !== 0 ? -minor : minor, currency);
}
