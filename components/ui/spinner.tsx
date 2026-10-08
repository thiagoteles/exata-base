import { cn } from "@/lib/cn";

/** A waiting indicator. It shows after 180ms; the button around it carries `aria-busy`. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span className="appear-after inline-flex" aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        className={cn("size-4 animate-spin", className)}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
