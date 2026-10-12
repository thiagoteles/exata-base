// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveStatus } from "./use-save-status";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("save status", () => {
  it("follows the form: clean, dirty", () => {
    const { result, rerender } = renderHook(
      ({ dirty }) => useSaveStatus(dirty, () => Promise.resolve(true)),
      {
        initialProps: { dirty: false },
      },
    );
    expect(result.current.status).toBe("clean");
    rerender({ dirty: true });
    expect(result.current.status).toBe("dirty");
  });

  it("prints the Saved stamp for two seconds after a save that worked, then goes back to the form", async () => {
    const { result, rerender } = renderHook(
      ({ dirty }) => useSaveStatus(dirty, () => Promise.resolve(true)),
      {
        initialProps: { dirty: true },
      },
    );
    await act(() => result.current.save());
    expect(result.current.status).toBe("saved");
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.status).toBe("saved");
    rerender({ dirty: false });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe("clean");
  });

  it("goes back to dirty, with nothing printed, when the save failed", async () => {
    const { result } = renderHook(() => useSaveStatus(true, () => Promise.resolve(false)));
    await act(() => result.current.save());
    expect(result.current.status).toBe("dirty");
  });

  it("reports saving while the action runs", async () => {
    let finish: (ok: boolean) => void = () => undefined;
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    const { result } = renderHook(() => useSaveStatus(true, () => pending));
    let saving: Promise<void> = Promise.resolve();
    act(() => {
      saving = result.current.save();
    });
    expect(result.current.status).toBe("saving");
    await act(async () => {
      finish(true);
      await saving;
    });
    expect(result.current.status).toBe("saved");
  });
});
