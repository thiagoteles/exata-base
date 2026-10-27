"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 960;
const MIN_WIDTH = 280;

/**
 * The width a chart is drawn at: its container's real width, so axis text keeps its token size
 * instead of scaling with the drawing.
 */
export function useFrameWidth(): [RefObject<HTMLDivElement | null>, number] {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = frame.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setWidth(Math.max(entry.contentRect.width, MIN_WIDTH));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [frame, width];
}
