// @vitest-environment happy-dom
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportTimeZone } from "./report-time-zone";

const rememberOption = vi.hoisted(() => vi.fn());
vi.mock("@/lib/preferences/actions", () => ({ rememberOption }));

const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
const elsewhere = here === "Asia/Tokyo" ? "America/Recife" : "Asia/Tokyo";

afterEach(() => {
  sessionStorage.clear();
  rememberOption.mockReset();
});

describe("reporting the browser's time zone", () => {
  it("says nothing when the saved zone is already this browser's", () => {
    render(<ReportTimeZone saved={here} />);
    expect(rememberOption).not.toHaveBeenCalled();
  });

  it("remembers the report in the tab once the server has kept it", async () => {
    rememberOption.mockResolvedValue({ data: here });
    render(<ReportTimeZone saved={elsewhere} />);
    await waitFor(() => expect(sessionStorage.getItem("reported-time-zone")).toBe(here));
  });

  it("sends it again on the next page when the first report did not arrive", async () => {
    rememberOption.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ data: here });
    const first = render(<ReportTimeZone saved={elsewhere} />);
    await waitFor(() => expect(rememberOption).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem("reported-time-zone")).toBeNull();
    first.unmount();
    render(<ReportTimeZone saved={elsewhere} />);
    await waitFor(() => expect(rememberOption).toHaveBeenCalledTimes(2));
  });
});
