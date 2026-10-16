"use client";

import { IconFile, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type ComponentProps,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./styles";

type FileInputProps = Omit<ComponentProps<"input">, "type" | "multiple" | "value">;

const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;

/*
 * One file, chosen by a click, the keyboard or a drop. Underneath it is a real file input, so a form
 * sends it as it always did and `onChange` reads `files` the usual way. Empty, it is a dashed area
 * that says what to do; with a file, it names the file and its size, with a way to change it or take
 * it out. Resetting the form empties it. The label is the field's, so it is named by it.
 */
export function FileInput({ className, onChange, disabled, ...props }: FileInputProps) {
  const t = useTranslations("ui.file");
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [over, setOver] = useState(false);

  // A form reset clears the input without a change event, so the name shown follows it here.
  useEffect(() => {
    const form = input.current?.form;
    const clear = () => setFile(null);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  const changed = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    setFile(chosen === undefined ? null : { name: chosen.name, size: chosen.size });
    onChange?.(event);
  };

  /** Puts files on the input as if chosen, and tells React they changed. */
  const place = (files: FileList | null) => {
    const element = input.current;
    if (element === null) {
      return;
    }
    if (files === null) {
      element.value = "";
    } else {
      element.files = files;
    }
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setOver(false);
    const first = event.dataTransfer.files[0];
    if (disabled || first === undefined) {
      return;
    }
    const one = new DataTransfer();
    one.items.add(first);
    place(one.files);
  };

  const size =
    file === null
      ? ""
      : file.size < BYTES_PER_KB * KB_PER_MB
        ? t("sizeKb", { kb: Math.max(1, Math.round(file.size / BYTES_PER_KB)) })
        : t("sizeMb", { mb: Math.round((file.size / BYTES_PER_KB / KB_PER_MB) * 10) / 10 });

  return (
    <div className={cn("flex flex-col", className)}>
      <input
        ref={input}
        type="file"
        className="peer sr-only"
        disabled={disabled}
        onChange={changed}
        {...props}
      />
      {file === null ? (
        <label
          htmlFor={props.id}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(!disabled);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={cn(
            "flex min-h-field cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-dashed px-4 py-4 transition-colors duration-120 ease-enter",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
            "peer-aria-[invalid=true]:border-danger peer-disabled:cursor-default peer-disabled:opacity-50",
            over
              ? "border-brand bg-brand-wash"
              : "border-line-strong bg-surface hover:border-ink hover:bg-sunken",
          )}
        >
          <IconUpload aria-hidden="true" className="size-5 shrink-0 text-ink-muted" stroke={1.75} />
          <span className="text-field-label text-ink underline decoration-line-strong underline-offset-4">
            {t("choose")}
          </span>
          <span className="text-body-small text-ink-muted">{t("drop")}</span>
        </label>
      ) : (
        <div className="flex min-h-field flex-wrap items-center gap-x-4 gap-y-2 rounded-control border-2 border-line-strong bg-surface py-2 pr-2 pl-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
          <IconFile aria-hidden="true" className="size-5 shrink-0 text-ink-muted" stroke={1.75} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="sr-only">{t("selected")}</span>
            <span className="truncate text-body text-ink">{file.name}</span>
            <span className="font-mono text-label text-ink-muted tabular-nums">{size}</span>
          </span>
          <span className="flex items-center gap-2">
            <label
              htmlFor={props.id}
              className={cn(buttonClasses("secondary", { size: "sm" }), "cursor-pointer")}
            >
              {t("change")}
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => place(null)}
              className="h-segment rounded-cell px-3 text-body-small font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t("remove")}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
