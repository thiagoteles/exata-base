import { brasilApi } from "./adapters/brasilapi";
import { viaCep } from "./adapters/viacep";
import type { CepResult, CepService } from "./types";

/*
 * The CEP port. ViaCEP first, with a short deadline; BrasilAPI when ViaCEP fails or is slow.
 * Neither needs a key. Both answers come out in the same shape.
 */

const DEADLINE_MS = 2500;
const cepDigits = /^\d{8}$/;
const nonDigits = /\D/g;

export async function lookupCep(
  input: string,
  services: readonly CepService[] = [viaCep(), brasilApi()],
): Promise<CepResult> {
  const cep = input.replace(nonDigits, "");
  if (!cepDigits.test(cep)) {
    return { status: "not_found" };
  }
  for (const service of services) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: the next service is asked only when this one fails
      return await service(cep, AbortSignal.timeout(DEADLINE_MS));
    } catch {
      // A slow or failing service hands over to the next one.
    }
  }
  return { status: "unavailable" };
}
