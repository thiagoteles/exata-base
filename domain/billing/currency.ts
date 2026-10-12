/*
 * Which currency a price is shown and charged in. Every price has the currency it was set in and may
 * carry more (the provider's currency options). The product decides which of them it offers; a person
 * may prefer one of those; and what is shown is the first of: their preference, the product's default,
 * the price's own currency, as long as the price really has it. Codes are lowercase, as providers write them.
 */

export type PriceInCurrencies = {
  /** The currency the price was set in, and its amount in cents. */
  currency: string;
  cents: number;
  /** The amount in each other currency the price carries. */
  options: Readonly<Record<string, number>>;
};

export type Shown = { currency: string; cents: number };

/** Every currency a price can be paid in, its own first. */
export function currenciesOf(price: PriceInCurrencies): string[] {
  return [price.currency, ...Object.keys(price.options).filter((code) => code !== price.currency)];
}

/** The currencies to offer a person for a set of prices: offered by the product and present in every price. */
export function currenciesToOffer(
  offered: readonly string[],
  prices: readonly PriceInCurrencies[],
): string[] {
  return offered.filter((code) => prices.every((price) => currenciesOf(price).includes(code)));
}

export function chooseCurrency(input: {
  preferred: string | undefined;
  defaultCurrency: string;
  available: readonly string[];
}): string | undefined {
  const { preferred, defaultCurrency, available } = input;
  if (preferred !== undefined && available.includes(preferred)) {
    return preferred;
  }
  return available.includes(defaultCurrency) ? defaultCurrency : available[0];
}

/** The amount of a price in a currency, or the price's own when it does not carry that one. */
export function priceIn(price: PriceInCurrencies, currency: string): Shown {
  if (currency === price.currency) {
    return { currency, cents: price.cents };
  }
  const cents = price.options[currency];
  return cents === undefined
    ? { currency: price.currency, cents: price.cents }
    : { currency, cents };
}
