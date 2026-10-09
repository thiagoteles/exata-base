import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { accountIsFree, PLAN_PAID } from "./environment";
import { messageSentTo } from "./mail";

/*
 * The admin area as the seeded admin uses it. The core path: sign in as the admin,
 * invite someone, and see the invite arrive in the mail catcher.
 */

const themes = ["light", "dark"] as const;
const CRON_SECRET = "local-development-cron-secret-0123456789";

async function open(page: Page, path: string, theme: (typeof themes)[number], heading: string) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:47300" }]);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

for (const theme of themes) {
  test(`the admin screens have no accessibility violations in the ${theme} theme`, async ({
    page,
  }) => {
    const screens = [
      ["/admin/numbers", "Números"],
      ["/admin/health", "Saúde"],
      ["/admin/users", "Usuários"],
      ["/admin/invites", "Convites"],
      ["/admin/audit", "Auditoria"],
    ] as const;
    for (const [path, heading] of screens) {
      await open(page, path, theme, heading);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map(
          (violation) =>
            `${path} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
        ),
      ).toEqual([]);
    }
  });
}

test("the admin invites someone, the invite arrives by e-mail, and the link opens sign-up for that address", async ({
  page,
  browser,
}) => {
  const email = `convidada-${Date.now()}@example.com`;
  await open(page, "/admin/invites", "light", "Convites");
  await page.getByLabel("E-mail de quem vai receber").fill(email);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByText("Convite enviado.", { exact: true })).toBeVisible();

  const list = page.getByRole("table", { name: "Convites" });
  const row = list.getByRole("row").filter({ hasText: email });
  await expect(row).toContainText("Pendente");

  const message = await messageSentTo(email, "Você foi convidado");
  expect(message.Text).toContain("admin@app.local");
  const link = /href="([^"]*sign-up\?invite=[^"]*)"/.exec(message.HTML)?.[1];
  expect(link).toBeTruthy();

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const guest = await visitor.newPage();
  await guest.goto((link ?? "").replaceAll("&amp;", "&"));
  await expect(guest.getByLabel("E-mail")).toHaveValue(email);
  await visitor.close();

  // Withdrawing the invite is confirmed first, and the list shows the new situation.
  await row.getByRole("button", { name: `Revogar convite de ${email}` }).click();
  const dialog = page.getByRole("alertdialog", { name: "Revogar o convite?" });
  await expect(dialog.getByText(`O link enviado para ${email} deixa de funcionar.`)).toBeVisible();
  await dialog.getByRole("button", { name: "Revogar convite" }).click();
  await expect(row).toContainText("Revogado");

  // Both writes are in the audit log.
  await open(page, "/admin/audit", "light", "Auditoria");
  await expect(
    page.getByRole("table", { name: "Auditoria" }).getByText("Criou convite").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Auditoria" }).getByText("Revogou convite").first(),
  ).toBeVisible();
});

test("the user list searches, opens a record, and an admin cannot delete themselves", async ({
  page,
}) => {
  // The courtesy button belongs to an account without a plan.
  test.skip(!(await accountIsFree(page)), PLAN_PAID);
  await open(page, "/admin/users", "light", "Usuários");
  await page.getByRole("searchbox", { name: "Buscar usuário" }).fill("admin@app.local");
  await expect(page).toHaveURL(/q=admin/);
  await page.getByRole("link", { name: "Admin", exact: true }).first().click();
  await expect(page.getByLabel("Papel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apagar a conta" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conceder cortesia" })).toBeVisible();
});

test("the scheduled calls refuse a call without the secret, know their cadences and clean up the same way twice", async ({
  request,
}) => {
  const refused = await request.post("/events");
  expect(refused.status()).toBe(401);
  expect(
    (await request.post("/events", { headers: { authorization: "Bearer wrong" } })).status(),
  ).toBe(401);
  expect((await request.get("/events")).status()).toBe(405);

  const headers = { authorization: `Bearer ${CRON_SECRET}` };
  // One address per cadence: the secret is checked first, then the group.
  expect((await request.post("/events/hourly")).status()).toBe(401);
  expect((await request.post("/events/nope")).status()).toBe(401);
  expect((await request.post("/events/nope", { headers })).status()).toBe(404);
  expect((await request.get("/events/hourly")).status()).toBe(405);
  const hourly = await request.post("/events/hourly", { headers });
  expect(hourly.status()).toBe(200);
  expect(await hourly.json()).toMatchObject({
    cadence: "hourly",
    ran: [],
    failed: [],
    skipped: [],
  });
  const daily = (await (await request.post("/events/daily", { headers })).json()) as {
    cadence: string;
    ran: { name: string }[];
  };
  expect(daily.cadence).toBe("daily");
  expect(daily.ran.map((entry) => entry.name)).toContain("purge-rate-limits");

  const first = await request.post("/events", { headers });
  expect(first.status()).toBe(200);
  const report = (await first.json()) as { ran: { name: string }[]; failed: unknown[] };
  expect(report.ran.map((entry) => entry.name)).toContain("purge-expired-invites");
  expect(report.failed).toEqual([]);

  const second = (await (await request.post("/events", { headers })).json()) as {
    ran: { name: string; result: { removed: number } }[];
  };
  expect(second.ran.find((entry) => entry.name === "purge-expired-invites")?.result).toEqual({
    removed: 0,
  });
});

test("a worker outside the server delivers a job run with its own secret and nothing else", async ({
  request,
}) => {
  const url = "/api/ingest/job-run";
  const run = { job: "collector", failed: 0, ms: 12 };
  const secret = "Bearer local-development-ingest-secret-0123456789";
  // The same 401 whether the secret is wrong, missing, or the source does not exist.
  expect((await request.post(url, { data: run })).status()).toBe(401);
  expect(
    (await request.post(url, { data: run, headers: { authorization: "Bearer wrong" } })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/ingest/nope", { data: run, headers: { authorization: secret } })
    ).status(),
  ).toBe(401);
  // The daily call's secret does not open an ingest source.
  expect(
    (
      await request.post(url, {
        data: run,
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      })
    ).status(),
  ).toBe(401);
  expect((await request.get(url)).status()).toBe(405);

  const ok = await request.post(url, { data: run, headers: { authorization: secret } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ result: { recorded: 1 } });
  const bad = await request.post(url, {
    data: { job: "daily", failed: 0, ms: 1 },
    headers: { authorization: secret },
  });
  expect(bad.status()).toBe(400);
});

test.describe("without a session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a visitor is sent to sign-in from every admin screen", async ({ page }) => {
    for (const path of ["/admin/users", "/admin/invites", "/admin/audit", "/admin/health"]) {
      await page.goto(path);
      expect(new URL(page.url()).pathname).toBe("/sign-in");
    }
  });
});

test("the numbers follow the chosen period and every chart has a table", async ({ page }) => {
  await open(page, "/admin/numbers?range=7", "light", "Números");
  const periods = page.getByRole("navigation", { name: "Período" });
  await expect(periods.getByRole("link", { name: "7 dias" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await periods.getByRole("link", { name: "90 dias" }).click();
  await expect(page).toHaveURL(/range=90/);
  await expect(periods.getByRole("link", { name: "90 dias" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Each day is a focus stop that says its value, and the same values are in a table.
  const signups = page
    .getByRole("figure")
    .filter({ has: page.getByRole("img", { name: "Cadastros por dia" }) });
  await expect(signups.getByRole("button")).toHaveCount(90);
  await signups.getByText("Ver os números em tabela").click();
  await expect(signups.getByRole("table").getByRole("row")).toHaveCount(91);
});

test("the health panel shows the daily job on time right after the daily call", async ({
  page,
  request,
}) => {
  const ran = await request.post("/events", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(ran.status()).toBe(200);
  await open(page, "/admin/health", "light", "Saúde");
  const daily = page.getByRole("table", { name: "Trabalhos agendados" }).getByRole("row", {
    name: /daily/,
  });
  await expect(daily.getByText("Em dia")).toBeVisible();
  await expect(page.getByText("Respondendo")).toBeVisible();
});
