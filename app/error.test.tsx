// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import ErrorPage from "./error";

const report = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

beforeEach(() => {
  vi.stubGlobal("fetch", report);
});

afterEach(() => {
  vi.unstubAllGlobals();
  report.mockClear();
});

describe("error page", () => {
  it("reports the error to the server once, with the digest and the page", () => {
    renderWithIntl(
      <ErrorPage error={Object.assign(new Error("boom"), { digest: "abc" })} retry={vi.fn()} />,
    );
    expect(report).toHaveBeenCalledOnce();
    const [url, init] = report.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/client-errors");
    expect(JSON.parse(String(init.body))).toMatchObject({
      source: "page",
      message: "boom",
      digest: "abc",
    });
  });

  it("says what to do next and shows the code the server logged for this error", async () => {
    const retry = vi.fn();
    renderWithIntl(
      <ErrorPage error={Object.assign(new Error("boom"), { digest: "44960610" })} retry={retry} />,
    );
    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeTruthy();
    expect(screen.getByText("Código do erro: 44960610")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ir para o início" }).getAttribute("href")).toBe("/");
  });

  it("never shows the message of the error, which may hold something private", () => {
    renderWithIntl(<ErrorPage error={new Error("password=hunter2")} retry={vi.fn()} />);
    expect(screen.queryByText(/hunter2/)).toBeNull();
    expect(screen.queryByText(/Código do erro/)).toBeNull();
  });
});
