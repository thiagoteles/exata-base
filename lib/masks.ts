/*
 * Input masks for Brazilian data. A mask only formats what a person types; it never decides
 * whether the value is valid. Validation lives in `lib/validation-br.ts`.
 */

const nonDigits = /\D/g;
const leadingZeros = /^0+/;
const thousandsBoundary = /\B(?=(\d{3})+(?!\d))/g;

export const digitsOf = (input: string): string => input.replace(nonDigits, "");

/** Lays digits over a pattern where `0` is a digit, stopping where the digits end. */
function applyPattern(digits: string, pattern: string): string {
  let result = "";
  let index = 0;
  for (const symbol of pattern) {
    if (index >= digits.length) {
      break;
    }
    if (symbol === "0") {
      result += digits.charAt(index);
      index += 1;
    } else {
      result += symbol;
    }
  }
  return result;
}

const CPF_DIGITS = 11;
const CEP_DIGITS = 8;
const DATE_DIGITS = 8;
const LANDLINE_DIGITS = 10;
const MOBILE_DIGITS = 11;

export const maskCpf = (input: string) =>
  applyPattern(digitsOf(input).slice(0, CPF_DIGITS), "000.000.000-00");

export const maskCep = (input: string) =>
  applyPattern(digitsOf(input).slice(0, CEP_DIGITS), "00000-000");

export const maskDate = (input: string) =>
  applyPattern(digitsOf(input).slice(0, DATE_DIGITS), "00/00/0000");

export function maskPhone(input: string): string {
  const digits = digitsOf(input).slice(0, MOBILE_DIGITS);
  return applyPattern(
    digits,
    digits.length > LANDLINE_DIGITS ? "(00) 00000-0000" : "(00) 0000-0000",
  );
}

const MAX_MONEY_DIGITS = 13;

/**
 * Money is typed from the right, like a payment terminal: the digits are cents, so "123456"
 * reads "1.234,56". An empty field stays empty.
 */
export function maskMoney(input: string): string {
  const digits = digitsOf(input).replace(leadingZeros, "").slice(0, MAX_MONEY_DIGITS);
  if (digits === "") {
    return "";
  }
  const cents = digits.padStart(3, "0");
  const whole = cents.slice(0, -2).replace(thousandsBoundary, ".");
  return `${whole},${cents.slice(-2)}`;
}
