import { dateInZone as calendarDate } from "@/domain/calendar";
import { defaultLocale, timeZone } from "@/lib/i18n/locales";

/*
 * Two kinds of time. A calendar date (a birthday, a due date) is an ISO `YYYY-MM-DD` string with
 * no time zone. An instant is a Date stored as timestamptz and shown in a time zone: the person's
 * when the screen is theirs, America/Sao_Paulo otherwise.
 * Both are written `dd/mm/aaaa` on screen in the default language, and in the form of the language otherwise.
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

/** A calendar date written for a language: `dd/mm/aaaa` in the default one, the language's own short form elsewhere. */
export function formatDate(value: IsoDate, locale: string = defaultLocale): string {
  const [, year = "", month = "", day = ""] = iso.exec(value) ?? [];
  if (locale === defaultLocale) {
    return `${day}/${month}/${year}`;
  }
  // The date has no zone, so it is formatted in UTC from midnight UTC and never moves a day.
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  );
}

/** The calendar date an instant falls on in a time zone, the product's own unless one is given. */
function dateInZone(instant: Date, zone: string = timeZone): IsoDate {
  return calendarDate(instant, zone) as IsoDate;
}

/** The calendar date an instant falls on in America/Sao_Paulo, the product's own zone. */
export function dateInSaoPaulo(instant: Date): IsoDate {
  return dateInZone(instant, timeZone);
}

/** An instant written as a date, in the person's time zone when the screen knows it and in their language. */
export function formatInstantDate(
  instant: Date,
  zone: string = timeZone,
  locale: string = defaultLocale,
): string {
  return formatDate(dateInZone(instant, zone), locale);
}
