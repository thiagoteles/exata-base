import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";

const chromeMac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";
const safariIphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const edgeWindows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0";
const firefoxLinux = "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0";
const chromeAndroid =
  "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";

describe("describing a device from its user agent", () => {
  it("names the browser and the system a person would", () => {
    expect(describeDevice(chromeMac)).toEqual({ browser: "Chrome", system: "macOS" });
    expect(describeDevice(safariIphone)).toEqual({ browser: "Safari", system: "iOS" });
    expect(describeDevice(edgeWindows)).toEqual({ browser: "Edge", system: "Windows" });
    expect(describeDevice(firefoxLinux)).toEqual({ browser: "Firefox", system: "Linux" });
  });

  it("calls an Android phone Android, not Linux", () => {
    expect(describeDevice(chromeAndroid)).toEqual({ browser: "Chrome", system: "Android" });
  });

  it("leaves what it does not know as null, and takes a missing agent without failing", () => {
    expect(describeDevice("curl/8.0")).toEqual({ browser: null, system: null });
    expect(describeDevice(null)).toEqual({ browser: null, system: null });
    expect(describeDevice(undefined)).toEqual({ browser: null, system: null });
    expect(describeDevice("")).toEqual({ browser: null, system: null });
  });
});
