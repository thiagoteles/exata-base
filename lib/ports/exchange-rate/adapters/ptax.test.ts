import { describe, expect, it } from "vitest";
import { ptax } from "./ptax";

// The shape the service answered with on the day this was written, for a range of one week.
const periodBody = {
  value: [
    {
      paridadeCompra: 1,
      paridadeVenda: 1,
      cotacaoCompra: 4.9853,
      cotacaoVenda: 4.9859,
      dataHoraCotacao: "2026-10-05 13:07:36.558602",
      tipoBoletim: "Fechamento",
    },
    {
      cotacaoCompra: 4.9692,
      cotacaoVenda: 4.9698,
      dataHoraCotacao: "2026-10-06 13:03:21.267287",
      tipoBoletim: "Fechamento PTAX",
    },
    {
      cotacaoCompra: 4.99,
      cotacaoVenda: 5.0,
      dataHoraCotacao: "2026-10-07 10:00:00.000000",
      tipoBoletim: "Abertura",
    },
    { cotacaoCompra: 1, dataHoraCotacao: "2026-10-08 13:00:00.000000", tipoBoletim: "Fechamento" },
  ],
};

function fakeFetch(body: unknown, status = 200) {
  const calls: string[] = [];
  const fetch = (url: string | URL | Request) => {
    calls.push(String(url));
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

const { signal } = new AbortController();

describe("the central bank's PTAX service", () => {
  it("asks for the range with the dates month-day-year and the closing label filtered", async () => {
    const { calls, fetch } = fakeFetch(periodBody);
    await ptax(fetch).closings("USD", "2026-10-05", "2026-10-09", signal);
    const url = decodeURIComponent(calls[0] ?? "");
    expect(url).toContain(
      "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)",
    );
    expect(url).toContain("@moeda='USD'");
    expect(url).toContain("@dataInicial='10-05-2026'");
    expect(url).toContain("@dataFinalCotacao='10-09-2026'");
    expect(url).toContain("$filter=tipoBoletim eq 'Fechamento'");
  });

  it("keeps only the closing bulletins that carry both quotes, by the start of the label", async () => {
    const { fetch } = fakeFetch(periodBody);
    expect(await ptax(fetch).closings("USD", "2026-10-05", "2026-10-09", signal)).toEqual([
      { day: "2026-10-05", buy: "4.9853", sell: "4.9859" },
      { day: "2026-10-06", buy: "4.9692", sell: "4.9698" },
    ]);
  });

  it("answers with no quotes for a range with no closing", async () => {
    const { fetch } = fakeFetch({ value: [] });
    expect(await ptax(fetch).closings("USD", "2026-10-10", "2026-10-11", signal)).toEqual([]);
  });

  it("throws when the service refuses or answers with something else", async () => {
    await expect(
      ptax(fakeFetch({}, 500).fetch).closings("USD", "2026-10-05", "2026-10-09", signal),
    ).rejects.toThrow("500");
    await expect(
      ptax(fakeFetch({ nothing: true }).fetch).closings("USD", "2026-10-05", "2026-10-09", signal),
    ).rejects.toThrow("value list");
  });
});
