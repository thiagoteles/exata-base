import type { ClosingQuote, ExchangeRateSource } from "../types";

/*
 * The central bank's PTAX service. A public API with no key. The period endpoint returns every
 * bulletin of a range, so the closing one is picked by its label: the label is "Fechamento" here and
 * "Fechamento PTAX" in the day endpoint, which is why it is compared by its start. The dates in the
 * address are month-day-year and text parameters are quoted. A day with no closing is simply absent.
 */

const BASE = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
const CLOSING_LABEL = "Fechamento";

type Bulletin = {
  cotacaoCompra?: number;
  cotacaoVenda?: number;
  dataHoraCotacao?: string;
  tipoBoletim?: string;
};

/** `2026-10-09` as the service wants it: `10-09-2026`. */
function serviceDay(day: string): string {
  const [year, month, date] = day.split("-");
  return `${month}-${date}-${year}`;
}

export function ptax(fetch: typeof globalThis.fetch = globalThis.fetch): ExchangeRateSource {
  return {
    name: "ptax",
    async closings(currency, from, to, signal) {
      const query = [
        `@moeda='${currency}'`,
        `@dataInicial='${serviceDay(from)}'`,
        `@dataFinalCotacao='${serviceDay(to)}'`,
        `$filter=${encodeURIComponent(`tipoBoletim eq '${CLOSING_LABEL}'`)}`,
        `$orderby=${encodeURIComponent("dataHoraCotacao asc")}`,
        "$format=json",
      ].join("&");
      const url = `${BASE}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${query}`;
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`PTAX answered ${response.status}`);
      }
      const body = (await response.json()) as { value?: Bulletin[] };
      if (!Array.isArray(body.value)) {
        throw new Error("PTAX answered with no value list");
      }
      return body.value.flatMap((bulletin): ClosingQuote[] => {
        const { cotacaoCompra, cotacaoVenda, dataHoraCotacao, tipoBoletim } = bulletin;
        if (
          typeof cotacaoCompra !== "number" ||
          typeof cotacaoVenda !== "number" ||
          typeof dataHoraCotacao !== "string" ||
          typeof tipoBoletim !== "string" ||
          !tipoBoletim.startsWith(CLOSING_LABEL)
        ) {
          return [];
        }
        return [
          {
            day: dataHoraCotacao.slice(0, 10),
            buy: String(cotacaoCompra),
            sell: String(cotacaoVenda),
          },
        ];
      });
    },
  };
}
