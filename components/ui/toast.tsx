"use client";

import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Toast as Primitive } from "radix-ui";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { layerClasses } from "./styles";
import { ToastContext, type ToastInput } from "./use-toast";

/*
 * A toast is for something that happened outside the current screen. Saving is confirmed on the
 * screen itself, never here. It closes after 6 seconds, or stays until closed when it has an action.
 */

type ToastItem = ToastInput & { id: string };

const AUTO_CLOSE_MS = 6000;

const icons = {
  success: <IconCircleCheck className="size-5 shrink-0 text-success-ink" aria-hidden="true" />,
  warning: <IconAlertTriangle className="size-5 shrink-0 text-warning-ink" aria-hidden="true" />,
  danger: <IconAlertTriangle className="size-5 shrink-0 text-danger-ink" aria-hidden="true" />,
  info: <IconInfoCircle className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />,
} as const;

const borders = {
  success: "border-success-ink",
  warning: "border-warning-ink",
  danger: "border-danger-ink",
  info: "border-brand-ink",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("ui");
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = (toast: ToastInput) =>
    setItems((current) => [...current, { ...toast, id: crypto.randomUUID() }]);
  const dismiss = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <ToastContext value={notify}>
      <Primitive.Provider swipeDirection="right">
        {children}
        {items.map(({ id, title, description, tone = "info", action }) => (
          <Primitive.Root
            key={id}
            duration={action === undefined ? AUTO_CLOSE_MS : Number.POSITIVE_INFINITY}
            onOpenChange={(open) => (open ? undefined : dismiss(id))}
            className={cn(
              layerClasses,
              "flex items-start gap-3 border-2 p-4 data-[state=closed]:animate-fade-out",
              borders[tone],
            )}
          >
            {icons[tone]}
            <div className="flex-1">
              <Primitive.Title className="text-block-title">{title}</Primitive.Title>
              {description === undefined ? null : (
                <Primitive.Description className="text-body-small text-ink">
                  {description}
                </Primitive.Description>
              )}
              {action === undefined ? null : (
                <Primitive.Action altText={action.label} asChild={true}>
                  <button
                    type="button"
                    onClick={action.onAction}
                    className="mt-2 h-11 text-button font-semibold text-brand-ink underline"
                  >
                    {action.label}
                  </button>
                </Primitive.Action>
              )}
            </div>
            <Primitive.Close
              aria-label={t("close")}
              className="inline-flex size-11 items-center justify-center text-ink-muted hover:text-ink"
            >
              <IconX className="size-5" aria-hidden="true" />
            </Primitive.Close>
          </Primitive.Root>
        ))}
        <Primitive.Viewport className="fixed right-4 bottom-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none max-lg:bottom-20" />
      </Primitive.Provider>
    </ToastContext>
  );
}
