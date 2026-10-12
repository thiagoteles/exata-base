/* What identifies a receipt to the person who holds it, from the payment's own id. */

const NUMBER_CHARS = 8;

/** The short number printed on a receipt and shown on its verification page. */
export const receiptNumber = (paymentId: string): string =>
  `R-${paymentId.replaceAll("-", "").slice(0, NUMBER_CHARS).toUpperCase()}`;
