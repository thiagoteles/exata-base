import { ptax } from "./adapters/ptax";
import type { ClosingsResult, ExchangeRateSource } from "./types";

/*
 * The exchange-rate port. One source, the central bank's PTAX, with a short deadline: a slow or
 * failing source is reported as unavailable, which is an answer the caller handles (the person may
 * type a quote, or wait). No key is needed. The shape of a source is open for another one.
 */

const DEADLINE_MS = 2500;

export async function fetchClosings(
  currency: string,
  from: string,
  to: string,
  source: ExchangeRateSource = ptax(),
): Promise<ClosingsResult> {
  try {
    const quotes = await source.closings(currency, from, to, AbortSignal.timeout(DEADLINE_MS));
    return { status: "ok", quotes };
  } catch {
    return { status: "unavailable" };
  }
}
