"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";
import { dialogContentClasses, overlayClasses } from "./styles";

type ConfirmDialogProps = {
  /** The element that opens the dialog, usually a Button. Omit it to control `open` yourself. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  /** What will happen, in plain body text. Name the object: "Excluir 3 pedidos". */
  consequence: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Destructive actions use the danger button. */
  destructive?: boolean;
  pending?: boolean;
};

/** Every action that deletes or cannot be undone goes through this dialog. */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      {trigger === undefined ? null : <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClasses} />
        <AlertDialog.Content className={dialogContentClasses}>
          <AlertDialog.Title className="text-section">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-body">{consequence}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3 max-md:flex-col-reverse">
            <AlertDialog.Cancel asChild={true}>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild={true}>
              <Button
                variant={destructive ? "danger" : "primary"}
                loading={pending}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
