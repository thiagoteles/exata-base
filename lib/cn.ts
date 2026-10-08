import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
  colorTokens,
  easeTokens,
  fontTokens,
  radiusTokens,
  shadowTokens,
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
});

/** Joins conditional classes and lets the last one win when two set the same property. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
