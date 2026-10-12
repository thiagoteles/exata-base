// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/tests/render";
import { UnsavedDialog } from "./unsaved-dialog";
import { useUnsavedGuard } from "./use-unsaved-guard";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Harness({ dirty }: { dirty: boolean }) {
  const guard = useUnsavedGuard(dirty);
  return (
    <>
      <a href="/outra-pagina">Sair</a>
      <a href="/outra-pagina" target="_blank" rel="noreferrer">
        Nova aba
      </a>
      <a href="https://example.com/fora">Fora</a>
      <UnsavedDialog open={guard.isAsking} onLeave={guard.leave} onStay={guard.stay} />
    </>
  );
}

const navigations: string[] = [];
const onClickCapture = (event: Event) => {
  const link = (event.target as Element).closest("a");
  if (link !== null && !event.defaultPrevented) {
    navigations.push(link.getAttribute("href") ?? "");
  }
  event.preventDefault();
};

describe("unsaved changes guard", () => {
  it("lets a link through when nothing changed", async () => {
    document.addEventListener("click", onClickCapture);
    navigations.length = 0;
    renderWithIntl(<Harness dirty={false} />);
    await userEvent.click(screen.getByRole("link", { name: "Sair" }));
    expect(navigations).toEqual(["/outra-pagina"]);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    document.removeEventListener("click", onClickCapture);
  });

  it("asks before leaving through a link, and keeps the person here if they stay", async () => {
    renderWithIntl(<Harness dirty />);
    await userEvent.click(screen.getByRole("link", { name: "Sair" }));
    expect(screen.getByRole("alertdialog", { name: "Sair sem salvar?" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves to the link's address when the person confirms", async () => {
    renderWithIntl(<Harness dirty />);
    await userEvent.click(screen.getByRole("link", { name: "Sair" }));
    await userEvent.click(screen.getByRole("button", { name: "Sair sem salvar" }));
    expect(push).toHaveBeenCalledWith("/outra-pagina");
  });

  it("does not stop a link to another site or a new tab", async () => {
    document.addEventListener("click", onClickCapture);
    navigations.length = 0;
    renderWithIntl(<Harness dirty />);
    await userEvent.click(screen.getByRole("link", { name: "Fora" }));
    await userEvent.click(screen.getByRole("link", { name: "Nova aba" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(navigations).toEqual(["https://example.com/fora", "/outra-pagina"]);
    document.removeEventListener("click", onClickCapture);
  });

  it("asks the browser to confirm a reload or a closed tab only while there is something unsaved", () => {
    const { rerender } = renderWithIntl(<Harness dirty />);
    const unload = new Event("beforeunload", { cancelable: true });
    globalThis.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    rerender(<Harness dirty={false} />);
    const clean = new Event("beforeunload", { cancelable: true });
    globalThis.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
  });
});
