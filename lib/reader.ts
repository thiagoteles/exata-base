import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { dateInZone } from "@/domain/calendar";
import { currentInstant } from "@/domain/clock";
import type { IsoDate } from "@/lib/date";
import { resolvePreferences } from "@/lib/preferences/resolve";

/*
 * What a page needs to write for the person reading it: their time zone, their language, the
 * instant of the request and the calendar day it falls on for them. The clock is read here, once,
 * after the request is known to be dynamic, so a page never reads it on its own.
 */

export type Reader = { timeZone: string; locale: string; now: Date; today: IsoDate };

export async function readerOf(user: {
  options: Readonly<Record<string, unknown>>;
}): Promise<Reader> {
  await connection();
  const { timeZone } = resolvePreferences(user.options);
  const now = currentInstant();
  return { timeZone, locale: await getLocale(), now, today: dateInZone(now, timeZone) as IsoDate };
}
