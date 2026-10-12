import { IconAlertCircle } from "@tabler/icons-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { controlClasses } from "./styles";

export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

type FieldProps = {
  label: string;
  /** Shown below the control. An error replaces it; they never appear together. */
  help?: string | undefined;
  error?: string | undefined;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, help, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = error !== undefined || help !== undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-field-label text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": hasMessage ? messageId : undefined,
        "aria-invalid": error === undefined ? undefined : true,
      })}
      {error === undefined ? null : (
        <p id={messageId} className="flex items-start gap-1.5 text-body-small text-danger-ink">
          <IconAlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {error === undefined && help !== undefined ? (
        <p id={messageId} className="max-w-[52ch] text-body-small text-ink-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "h-auto min-h-32 py-3", className)} {...props} />;
}
