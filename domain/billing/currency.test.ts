import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  chooseCurrency,
  currenciesOf,
  currenciesToOffer,
  type PriceInCurrencies,
  priceIn,
} from "./currency";

const monthly: PriceInCurrencies = {
  currency: "brl",
  cents: 2900,
  options: { usd: 599, eur: 549 },
};
const yearly: PriceInCurrencies = { currency: "brl", cents: 29_000, options: { usd: 5999 } };

describe("the currencies of a price", () => {
  it("lists its own first, then the others", () => {
    expect(currenciesOf(monthly)).toEqual(["brl", "usd", "eur"]);
    expect(currenciesOf({ currency: "brl", cents: 1, options: { brl: 1, usd: 2 } })).toEqual([
      "brl",
      "usd",
    ]);
  });

  it("offers only what the product offers and every price carries", () => {
    expect(currenciesToOffer(["brl", "usd", "eur"], [monthly, yearly])).toEqual(["brl", "usd"]);
    expect(currenciesToOffer(["brl"], [monthly, yearly])).toEqual(["brl"]);
    expect(currenciesToOffer(["usd"], [{ currency: "brl", cents: 1, options: {} }])).toEqual([]);
  });
});

describe("choosing the currency to show", () => {
  const available = ["brl", "usd"];
  it("takes the preference when it can, else the default, else the first", () => {
    expect(chooseCurrency({ preferred: "usd", defaultCurrency: "brl", available })).toBe("usd");
    expect(chooseCurrency({ preferred: "eur", defaultCurrency: "brl", available })).toBe("brl");
    expect(chooseCurrency({ preferred: undefined, defaultCurrency: "brl", available })).toBe("brl");
    expect(chooseCurrency({ preferred: undefined, defaultCurrency: "eur", available })).toBe("brl");
    expect(
      chooseCurrency({ preferred: "usd", defaultCurrency: "brl", available: [] }),
    ).toBeUndefined();
  });
});

describe("the amount in a currency", () => {
  it("is the price's own, an option, or the price's own again when the currency is unknown to it", () => {
    expect(priceIn(monthly, "brl")).toEqual({ currency: "brl", cents: 2900 });
    expect(priceIn(monthly, "usd")).toEqual({ currency: "usd", cents: 599 });
    expect(priceIn(yearly, "eur")).toEqual({ currency: "brl", cents: 29_000 });
  });

  it("always answers with a currency the price has and a whole number of cents", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("brl", "usd", "eur", "jpy"),
        fc.dictionary(
          fc.constantFrom("usd", "eur", "jpy"),
          fc.integer({ min: 1, max: 10_000_000 }),
        ),
        fc.string({ minLength: 3, maxLength: 3 }),
        (currency, options, asked) => {
          const price: PriceInCurrencies = { currency, cents: 1000, options };
          const shown = priceIn(price, asked);
          expect(currenciesOf(price)).toContain(shown.currency);
          expect(Number.isInteger(shown.cents)).toBe(true);
        },
      ),
    );
  });
});
