import type { ReactNode } from "react";
import { Paywall } from "./paywall";

type GateProps = {
  /** Whether the person's plan opens it, decided by the caller with the plan guard. */
  open: boolean;
  /** Where this door is, for analytics. */
  source: string;
  /** Names the closed door for a screen reader. */
  label: string;
  closed: { title: string; body: string; benefits: readonly string[] };
  /** The way to the plans. */
  action: ReactNode;
  children: ReactNode;
};

/**
 * The content for a plan that has the feature, the paywall for one that does not. It only speaks:
 * whether the door is open is a plan question the caller answers with the same guard a route uses
 * (`hasFeature`), so the door and the data behind it open and shut together.
 */
export function Gate({ open, source, label, closed, action, children }: GateProps) {
  if (open) {
    return children;
  }
  return (
    <Paywall
      source={source}
      label={label}
      title={closed.title}
      body={closed.body}
      benefits={closed.benefits}
      action={action}
    />
  );
}
