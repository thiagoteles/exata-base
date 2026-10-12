"use client";

import { IconCheck, IconLock } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";
import { track } from "@/lib/analytics";

type PaywallProps = {
  /** Where the person met it, such as the name of the screen. It goes to analytics with the view. */
  source: string;
  title: string;
  body: string;
  /** What the plan opens, a few short lines. */
  benefits: readonly string[];
  /** The one thing to do: usually the way to the plans. */
  action: ReactNode;
  /** Names the section for a screen reader. */
  label: string;
};

/*
 * What a person sees where a paid feature would be. It says what is closed, what the plan opens
 * and gives one way forward; nothing blurs the content behind it, nothing nags. A lock mark sits
 * in a ruled gutter on the left, so the block reads as a door and not as a banner. Seeing it is an
 * event: the funnel counts how many people reach a closed door, and from where.
 */
export function Paywall({ source, title, body, benefits, action, label }: PaywallProps) {
  useEffect(() => {
    track("paywall_viewed", { source });
  }, [source]);
  return (
    <section
      aria-label={label}
      className="grid gap-x-6 gap-y-4 rounded-panel border border-line-strong bg-surface p-panel-inset sm:grid-cols-[auto_minmax(0,1fr)]"
    >
      <span
        aria-hidden="true"
        className="flex size-control items-center justify-center rounded-full border-2 border-ink text-ink sm:row-span-3"
      >
        <IconLock className="size-5" />
      </span>
      <h3 className="text-block-title text-ink">{title}</h3>
      <div className="flex flex-col gap-3">
        <p className="max-w-[56ch] text-body text-ink-muted">{body}</p>
        <ul className="flex flex-col gap-1.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-body text-ink">
              <IconCheck
                className="mt-1 size-4 shrink-0 text-success-ink"
                stroke={3}
                aria-hidden="true"
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="self-start">{action}</div>
    </section>
  );
}
