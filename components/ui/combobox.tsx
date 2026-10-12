"use client";

import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Popover as Primitive } from "radix-ui";
import { type KeyboardEvent, useId, useState } from "react";
import { cn } from "@/lib/cn";
import type { FieldControlProps } from "./field";
import type { Option } from "./select";
import { controlClasses, layerClasses } from "./styles";

type ComboboxProps = Partial<FieldControlProps> & {
  options: readonly Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type PanelProps = Pick<ComboboxProps, "options" | "value" | "placeholder"> & {
  onChoose: (option: Option) => void;
};

/** Search text, the filtered list and the highlighted row, with the keys that move through it. */
function useSearch(options: readonly Option[], onChoose: (option: Option) => void) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const shown = options.filter((option) => normalize(option.label).includes(normalize(query)));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = shown[active];
      if (option !== undefined) {
        onChoose(option);
      }
    }
  };
  const search = (text: string) => {
    setQuery(text);
    setActive(0);
  };
  return { query, search, shown, active, setActive, onKeyDown };
}

type RowProps = {
  option: Option;
  id: string;
  isActive: boolean;
  isSelected: boolean;
  onHover: () => void;
  onChoose: () => void;
};

function ComboboxRow({ option, id, isActive, isSelected, onHover, onChoose }: RowProps) {
  return (
    <div
      id={id}
      role="option"
      tabIndex={-1}
      aria-selected={isSelected}
      onMouseEnter={onHover}
      onClick={onChoose}
      onKeyDown={() => undefined}
      className={cn(
        "flex h-control cursor-default items-center justify-between gap-2 rounded-cell px-3 text-body",
        isActive ? "bg-sunken" : undefined,
        isSelected ? "bg-brand-wash" : undefined,
      )}
    >
      {option.label}
      {isSelected ? <IconCheck className="size-4 text-brand-ink" aria-hidden="true" /> : null}
    </div>
  );
}

/** The search box and the list. It remounts on every open, so the search always starts empty. */
function ComboboxPanel({ options, value, placeholder, onChoose }: PanelProps) {
  const t = useTranslations("ui");
  const listId = useId();
  const { query, search, shown, active, setActive, onKeyDown } = useSearch(options, onChoose);
  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <>
      <input
        // biome-ignore lint/a11y/noAutofocus: the search box is the reason the list opened
        autoFocus={true}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown.length > 0 ? optionId(active) : undefined}
        aria-label={t("search")}
        value={query}
        onChange={(event) => search(event.target.value)}
        onKeyDown={onKeyDown}
        className="mb-1 h-control w-full rounded-cell border-2 border-line-strong bg-surface px-3 text-body outline-none focus:border-brand"
      />
      <div id={listId} role="listbox" aria-label={placeholder} className="max-h-64 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-3 py-2 text-body-small text-ink-muted">{t("noOptions")}</p>
        ) : null}
        {shown.map((option, index) => (
          <ComboboxRow
            key={option.value}
            option={option}
            id={optionId(index)}
            isActive={index === active}
            isSelected={option.value === value}
            onHover={() => setActive(index)}
            onChoose={() => onChoose(option)}
          />
        ))}
      </div>
    </>
  );
}

/*
 * A select with a search box. Radix has no combobox, so this follows the ARIA combobox pattern
 * on top of Radix Popover: focus stays in the input and the highlighted option is announced
 * through aria-activedescendant. Accents and case do not matter when searching.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  id,
  ...aria
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Primitive.Root open={open} onOpenChange={setOpen}>
      <Primitive.Trigger
        id={id}
        className={cn(
          controlClasses,
          "flex items-center justify-between gap-2 text-left",
          selected ? undefined : "text-ink-muted",
        )}
        {...aria}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <IconChevronDown className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          sideOffset={8}
          className={cn(layerClasses, "w-(--radix-popover-trigger-width) p-1")}
        >
          <ComboboxPanel
            options={options}
            value={value}
            placeholder={placeholder}
            onChoose={(option) => {
              onValueChange(option.value);
              setOpen(false);
            }}
          />
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
