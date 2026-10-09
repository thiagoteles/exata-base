/*
 * Sampling by a stable key, so the same key always gets the same answer and no randomness is read.
 * The key is folded into an integer, and the integer is spread over [0, 1) by the golden ratio
 * (a Weyl sequence), which places consecutive integers far apart: ids that differ only in their
 * last digits still land all over the range.
 */

const PRIME = 2_147_483_647;
const BASE = 31;
const GOLDEN = 0.618_033_988_749_894_9;

/** A key's place in [0, 1). */
export function samplePoint(key: string): number {
  let folded = 0;
  for (let index = 0; index < key.length; index += 1) {
    folded = (folded * BASE + key.charCodeAt(index)) % PRIME;
  }
  return (folded * GOLDEN) % 1;
}

/** Whether a key falls inside a sample of the given rate, from 0 (none) to 1 (all). */
export function isSampled(key: string, rate: number): boolean {
  return samplePoint(key) < rate;
}
