import { timeZone } from "@/lib/i18n/locales";

/*
 * Two kinds of time. A calendar date (a birthday, a due date) is an ISO `YYYY-MM-DD` string with
 * no time zone. An instant is a Date stored as timestamptz and shown in America/Sao_Paulo.
 * Both are written `dd/mm/aaaa` on screen.
 */

declare const isoDateBrand: unique symbol;
export type IsoDate = string & { readonly [isoDateBrand]: true };

const typed = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const iso = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Reads `dd/mm/aaaa`. Returns null for a malformed or impossible date such as 31/02/2024. */
export function parseDate(input: string): IsoDate | null {
  const match = typed.exec(input.trim());
  if (match === null) {
    return null;
  }
  const [, day = "", month = "", year = ""] = match;
  if (!isRealDate(Number(year), Number(month), Number(day))) {
    return null;
  }
  return `${year}-${month}-${day}` as IsoDate;
}

export function formatDate(value: IsoDate): string {
  const [, year = "", month = "", day = ""] = iso.exec(value) ?? [];
  return `${day}/${month}/${year}`;
}

const saoPauloDay = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date an instant falls on in America/Sao_Paulo. */
export function dateInSaoPaulo(instant: Date): IsoDate {
  return saoPauloDay.format(instant) as IsoDate;
}

/** An instant written as `dd/mm/aaaa` in America/Sao_Paulo. */
export function formatInstantDate(instant: Date): string {
  return formatDate(dateInSaoPaulo(instant));
}
