import { funnel } from "@/lib/analytics-events";

/*
 * The saved reports every product gets, built from the event catalog's funnel. The setup creates
 * what is missing and corrects what drifted, matching by type and name; a report a person made by
 * hand in Umami is never touched.
 */

export type SavedReport = {
  id?: string;
  type: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

const MANAGED = "Mantido pelo pnpm umami setup.";
const WEEK_MINUTES = 7 * 24 * 60;
const DAY_MINUTES = 24 * 60;

const steps = (events: readonly string[]) => events.map((value) => ({ type: "event", value }));

export function standardReports(currency: string): SavedReport[] {
  return [
    {
      type: "funnel",
      name: "Funil completo",
      description: `Do cadastro ao pagamento, em até 7 dias. ${MANAGED}`,
      parameters: { window: WEEK_MINUTES, steps: steps(funnel) },
    },
    {
      type: "funnel",
      name: "Funil de compra",
      description: `Do checkout ao pagamento, em até 1 dia. ${MANAGED}`,
      parameters: { window: DAY_MINUTES, steps: steps(["checkout_started", "payment_confirmed"]) },
    },
    {
      type: "goal",
      name: "Cadastros concluídos",
      description: MANAGED,
      parameters: { type: "event", value: "signup_completed" },
    },
    {
      type: "goal",
      name: "Pagamentos confirmados",
      description: MANAGED,
      parameters: { type: "event", value: "payment_confirmed" },
    },
    {
      type: "revenue",
      name: "Receita",
      description: `Dos eventos payment_confirmed. ${MANAGED}`,
      parameters: { currency },
    },
    { type: "retention", name: "Retenção", description: MANAGED, parameters: {} },
    { type: "journey", name: "Caminhos", description: MANAGED, parameters: { steps: 5 } },
  ];
}

export type ReportPlan = {
  create: SavedReport[];
  update: (SavedReport & { id: string })[];
  keep: string[];
};

// Umami stores parameters as jsonb, which reorders keys, so equal parameters can print apart.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([key, inner]) => [key, canonical(inner)]),
    );
  }
  return value;
}

const same = (a: SavedReport, b: SavedReport) =>
  a.description === b.description &&
  JSON.stringify(canonical(a.parameters)) === JSON.stringify(canonical(b.parameters));

/** What to create and what to correct so the website holds the wanted reports. */
export function planReports(
  existing: readonly SavedReport[],
  wanted: readonly SavedReport[],
): ReportPlan {
  const plan: ReportPlan = { create: [], update: [], keep: [] };
  for (const report of wanted) {
    const found = existing.find((row) => row.type === report.type && row.name === report.name);
    if (found?.id === undefined) {
      plan.create.push(report);
    } else if (same(found, report)) {
      plan.keep.push(report.name);
    } else {
      plan.update.push({ ...report, id: found.id });
    }
  }
  return plan;
}
