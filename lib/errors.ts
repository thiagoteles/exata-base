import type messages from "@/messages/pt-BR.json";

/*
 * The single shape of a domain error. Code that refuses a request throws a DomainError with one
 * of five statuses and a catalog key; routes and actions turn it into the same body, always with
 * the request id. Anything that is not a DomainError is a 500 and is logged, never shown.
 */

export type ErrorKey = keyof (typeof messages)["errors"];
export type ErrorStatus = 400 | 401 | 403 | 404 | 409;

const defaultKeys: Readonly<Record<ErrorStatus, ErrorKey>> = {
  400: "badRequest",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
};

export class DomainError extends Error {
  readonly status: ErrorStatus;
  readonly key: ErrorKey;

  constructor(status: ErrorStatus, key: ErrorKey = defaultKeys[status], options?: ErrorOptions) {
    super(key, options);
    this.name = "DomainError";
    this.status = status;
    this.key = key;
  }
}

export type ErrorBody = {
  error: { status: ErrorStatus | 500; key: ErrorKey; requestId: string };
};

export function errorBody(error: unknown, requestId: string): ErrorBody {
  if (error instanceof DomainError) {
    return { error: { status: error.status, key: error.key, requestId } };
  }
  return { error: { status: 500, key: "internal", requestId } };
}
