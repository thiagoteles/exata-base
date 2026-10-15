"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  /** The spot on the page the link sits in, such as "hero" or "closing". It goes to analytics. */
  where: string;
};

/*
 * A link on the public site whose clicks are counted, so the funnel can say which call to action
 * brought a person in. It is an ordinary link otherwise: it navigates the same with no script.
 */
export function TrackedLink({ where, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        track("cta_click", { where });
        onClick?.(event);
      }}
    />
  );
}
