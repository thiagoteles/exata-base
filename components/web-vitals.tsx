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
 * Defined once, outside the component: the hook reports again to every new function it is handed.
 * Each metric has a fresh id per page load, which is the sampling key.
 */
function report(metric: Metric): void {
  if (!(reported.has(metric.name) && isSampled(metric.id, SAMPLE_RATE))) {
    return;
  }
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
