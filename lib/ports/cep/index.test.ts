import { describe, expect, it } from "vitest";
import { lookupCep } from ".";
import { brasilApi } from "./adapters/brasilapi";
import { viaCep } from "./adapters/viacep";
import type { CepService } from "./types";

const address = {
  cep: "01310100",
  street: "Avenida Paulista",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

const answering = (status: number, body: unknown) =>
  (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), { status }),
    )) as unknown as typeof globalThis.fetch;
const failing = (() => Promise.reject(new Error("offline"))) as typeof globalThis.fetch;

describe("CEP lookup", () => {
  it("reads ViaCEP and BrasilAPI into the same address", async () => {
    const via = viaCep(
      answering(200, {
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    );
    const brasil = brasilApi(
      answering(200, {
        street: "Avenida Paulista",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      }),
    );
    expect(await lookupCep("01310-100", [via])).toEqual({ status: "found", address });
    expect(await lookupCep("01310-100", [brasil])).toEqual({ status: "found", address });
  });

  it("treats a CEP that does not exist as an answer, not a failure", async () => {
    let fallbackCalls = 0;
    const fallback: CepService = () => {
      fallbackCalls += 1;
      return Promise.resolve({ status: "found", address });
    };
    expect(
      await lookupCep("99999999", [viaCep(answering(200, { erro: "true" })), fallback]),
    ).toEqual({
      status: "not_found",
    });
    expect(fallbackCalls).toBe(0);
    expect(await lookupCep("99999999", [brasilApi(answering(404, {}))])).toEqual({
      status: "not_found",
    });
  });

  it("falls back to BrasilAPI when ViaCEP fails", async () => {
    const brasil = brasilApi(
      answering(200, {
        street: "Avenida Paulista",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      }),
    );
    expect(await lookupCep("01310100", [viaCep(failing), brasil])).toEqual({
      status: "found",
      address,
    });
    expect(await lookupCep("01310100", [viaCep(answering(503, {})), brasil])).toEqual({
      status: "found",
      address,
    });
  });

  it("lets the person type the address when no service answers", async () => {
    expect(await lookupCep("01310100", [viaCep(failing), brasilApi(failing)])).toEqual({
      status: "unavailable",
    });
  });

  it("never calls a service for something that is not a CEP", async () => {
    expect(await lookupCep("123", [viaCep(failing)])).toEqual({ status: "not_found" });
  });
});
