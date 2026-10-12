type Address = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

/*
 * `not_found` is an answer: the CEP does not exist. `unavailable` means no service answered in
 * time; the form then lets the person type the address.
 */
export type CepResult =
  | { status: "found"; address: Address }
  | { status: "not_found" }
  | { status: "unavailable" };

/** A CEP service. It throws when it cannot answer, so the port can try the next one. */
export type CepService = (cep: string, signal: AbortSignal) => Promise<CepResult>;
