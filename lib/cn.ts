import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
  colorTokens,
  containerTokens,
  easeTokens,
  fontTokens,
  radiusTokens,
  shadowTokens,
  spacingTokens,
  textTokens,
} from "@/lib/design-tokens";

const merge = extendTailwindMerge({
  override: {
    theme: {
      color: [...colorTokens],
      text: [...textTokens],
      radius: [...radiusTokens],
      shadow: [...shadowTokens],
      ease: [...easeTokens],
      font: [...fontTokens],
    },
  },
  // Named sizes join Tailwind's numeric scale instead of replacing it.
  extend: {
    theme: {
      spacing: [...spacingTokens],
      container: [...containerTokens],
    },
  },
});

/** Joins conditional classes and lets the last one win when two set the same property. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
