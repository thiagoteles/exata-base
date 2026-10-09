"use client";

import { useReportWebVitals } from "next/web-vitals";
import { isSampled } from "@/domain/analytics/sample";
import { track } from "@/lib/analytics";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

// One page load in ten: enough for a weekly picture, little enough not to crowd the events.
const SAMPLE_RATE = 0.1;
const reported = new Set(["LCP", "INP", "CLS"]);
const CLS_DIGITS = 1000;

/*
 * The sample is decided per page load, so its three metrics are kept or dropped together. The key
 * is the moment this document started, which every page load has its own of; a metric's id would
 * not do, because each listener draws a fresh one.
 */
const pageLoad = typeof performance === "undefined" ? "" : String(performance.timeOrigin);

/*
 * A metric is sent once per navigation. In development React mounts effects twice, so the hook
 * listens twice and each metric arrives twice under different ids; doubled, it would skew the
 * averages. A client-side navigation has its own start, so it still counts on its own.
 */
const sent = new Set<string>();

/** Defined once, outside the component: the hook reports again to every new function it is handed. */
function report(metric: Metric): void {
  const once = `${metric.name} ${metric.navigationURL ?? ""} ${metric.navigationStartTime ?? 0}`;
  if (!(reported.has(metric.name) && isSampled(pageLoad, SAMPLE_RATE)) || sent.has(once)) {
    return;
  }
  sent.add(once);
  track("web_vital", {
    metric: metric.name,
    value:
      metric.name === "CLS"
        ? Math.round(metric.value * CLS_DIGITS) / CLS_DIGITS
        : Math.round(metric.value),
    rating: metric.rating,
  });
}

/** The page's Core Web Vitals, sent as analytics events. Rendered only when analytics is on. */
export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
