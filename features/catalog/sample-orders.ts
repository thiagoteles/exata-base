import type { IsoDate } from "@/lib/date";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import { type Cents, toCents } from "@/lib/money";

/* Made-up orders, so the list pattern can be shown with real filtering, sorting and paging. */

export const orderStatuses = ["new", "progress", "paid", "refused"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  amount: Cents;
  date: IsoDate;
};

const customers = [
  "Ana Souza",
  "Bruno Lima",
  "Camila Rocha",
  "Daniel Alves",
  "Eduarda Costa",
  "Fábio Dias",
  "Joana Prado",
  "Marcos Nunes",
];
const TOTAL = 47;
const BASE_CENTS = 1500;
const STEP_CENTS = 3733;

export const sampleOrders: readonly Order[] = Array.from({ length: TOTAL }, (_, index) => ({
  id: `order-${index + 1}`,
  customer: customers[index % customers.length] ?? "",
  status: orderStatuses[index % orderStatuses.length] ?? "new",
  amount: toCents(BASE_CENTS + ((index * STEP_CENTS) % 98_000)),
  date: `2026-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}` as IsoDate,
}));

export type OrderQuery = {
  q: string;
  status: OrderStatus | null;
  sort: "customer" | "amount" | "date" | "";
  dir: "asc" | "desc";
  page: number;
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const compare = (sort: OrderQuery["sort"]) => (a: Order, b: Order) => {
  if (sort === "customer") {
    return a.customer.localeCompare(b.customer, "pt-BR");
  }
  if (sort === "amount") {
    return a.amount - b.amount;
  }
  return a.date.localeCompare(b.date);
};

export function queryOrders({ q, status, sort, dir, page }: OrderQuery): {
  rows: Order[];
  window: PageWindow;
} {
  const term = normalize(q.trim());
  const matches = sampleOrders
    .filter(
      (order) =>
        (status === null || order.status === status) && normalize(order.customer).includes(term),
    )
    .sort(compare(sort));
  if (dir === "desc") {
    matches.reverse();
  }
  const window = pageWindow(page, matches.length);
  return {
    rows: matches.slice(window.offset, window.offset + (window.to - window.from + 1 || 0)),
    window,
  };
}
