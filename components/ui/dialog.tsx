"use client";

import { IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Dialog as Primitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { dialogContentClasses, overlayClasses } from "./styles";

/*
 * A dialog on wide screens, a sheet rising from the bottom edge below `md`. The consequence goes
 * in regular body text, never muted. Radix gives focus, keyboard, screen reader and layering.
 */

export function Dialog(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}

export function DialogTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger {...props} />;
}

export function DialogClose(props: ComponentProps<typeof Primitive.Close>) {
  return <Primitive.Close {...props} />;
}

type DialogContentProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function DialogContent({ title, description, children, className }: DialogContentProps) {
  const t = useTranslations("ui");
  return (
    <Primitive.Portal>
      <Primitive.Overlay className={overlayClasses} />
      <Primitive.Content
        className={cn(dialogContentClasses, className)}
        {...(description === undefined ? { "aria-describedby": undefined } : {})}
      >
        <Primitive.Title className="text-section">{title}</Primitive.Title>
        {description === undefined ? null : (
          <Primitive.Description className="text-body">{description}</Primitive.Description>
        )}
        {children}
        <Primitive.Close
          aria-label={t("close")}
          className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-control text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <IconX className="size-5" aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

/** Cancel then the action, bottom right. Stacked below `md` with the main action on top. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-3 max-md:flex-col-reverse">{children}</div>;
}
