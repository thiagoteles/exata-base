/*
 * Every request carries an id: the proxy sets it on the request and the response, the logger
 * binds it, and the error page shows it. An incoming id is kept only when it looks like one.
 */

export const REQUEST_ID_HEADER = "x-request-id";

const acceptedId = /^[A-Za-z0-9-]{8,64}$/;

export function requestIdFrom(headers: Headers): string {
  const incoming = headers.get(REQUEST_ID_HEADER);
  return incoming !== null && acceptedId.test(incoming) ? incoming : crypto.randomUUID();
}
