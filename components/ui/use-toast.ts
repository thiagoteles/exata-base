import { createContext, use } from "react";
import type { Tone } from "./styles";

export type ToastInput = {
  title: string;
  description?: string | undefined;
  tone?: Exclude<Tone, "neutral">;
  action?: { label: string; onAction: () => void };
};

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Shows a toast. Needs a ToastProvider above it. */
export function useToast(): (toast: ToastInput) => void {
  const notify = use(ToastContext);
  if (notify === null) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return notify;
}
