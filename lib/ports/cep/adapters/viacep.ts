import type { CepResult, CepService } from "../types";

type ViaCepBody = {
  erro?: unknown;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export function viaCep(fetch: typeof globalThis.fetch = globalThis.fetch): CepService {
  return async (cep, signal): Promise<CepResult> => {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
    if (response.status === 400) {
      return { status: "not_found" };
    }
    if (!response.ok) {
      throw new Error(`ViaCEP answered ${response.status}`);
    }
    const body = (await response.json()) as ViaCepBody;
    if (body.erro !== undefined) {
      return { status: "not_found" };
    }
    return {
      status: "found",
      address: {
        cep,
        street: body.logradouro ?? "",
        district: body.bairro ?? "",
        city: body.localidade ?? "",
        state: body.uf ?? "",
      },
    };
  };
}
