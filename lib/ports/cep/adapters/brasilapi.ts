import type { CepResult, CepService } from "../types";

type BrasilApiBody = { street?: string; neighborhood?: string; city?: string; state?: string };

export function brasilApi(fetch: typeof globalThis.fetch = globalThis.fetch): CepService {
  return async (cep, signal): Promise<CepResult> => {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
    if (response.status === 404) {
      return { status: "not_found" };
    }
    if (!response.ok) {
      throw new Error(`BrasilAPI answered ${response.status}`);
    }
    const body = (await response.json()) as BrasilApiBody;
    return {
      status: "found",
      address: {
        cep,
        street: body.street ?? "",
        district: body.neighborhood ?? "",
        city: body.city ?? "",
        state: body.state ?? "",
      },
    };
  };
}
