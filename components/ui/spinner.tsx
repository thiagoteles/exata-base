import { cn } from "@/lib/cn";
import type { Size } from "./styles";

const sizes: Record<Size, string> = { sm: "size-4", md: "size-6" };

/** A waiting indicator. It shows after 180ms; the button around it carries `aria-busy`. */
export function Spinner({ size = "sm", className }: { size?: Size; className?: string }) {
  return (
    <span className="appear-after inline-flex" aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        className={cn(sizes[size], "animate-spin", className)}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
