"use client";

import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  clampDate,
  isIsoDate,
  monthWeeks,
  startOfWeek,
} from "@/domain/calendar-grid";
import { cn } from "@/lib/cn";
import { formatDate, type IsoDate, parseDate } from "@/lib/date";
import { maskDate } from "@/lib/masks";
import { MaskedInput } from "./masked-input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import type { Size } from "./styles";

type DatePickerProps = {
  /** An ISO date `YYYY-MM-DD`, or an empty string when none is chosen. */
  value: string;
  /** Called with a real ISO date, or "" when what is typed is not one (yet). */
  onValueChange: (value: string) => void;
  /** Today, as an ISO date, given by the screen: this component never reads the clock. */
  today: string;
  min?: string;
  max?: string;
  /** 0 starts the week on Sunday, 1 on Monday. */
  weekStart?: 0 | 1;
  disabled?: boolean;
  size?: Size;
  /** The Field's id and aria props go to the typed input. */
  id?: string;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: true | undefined;
};

const cellSizes: Record<Size, string> = {
  sm: "size-8 text-body-small",
  md: "size-control text-body pointer-coarse:size-control-coarse",
};

const textOf = (value: string) => (isIsoDate(value) ? formatDate(value as IsoDate) : "");
const utcNoon = (value: string) => new Date(`${value}T12:00:00Z`);

type MonthProps = {
  /** The day that holds focus, and so the month that is drawn. */
  focused: string;
  onFocusedChange: (day: string, moveFocus: boolean) => void;
  value: string;
  today: string;
  min: string | undefined;
  max: string | undefined;
  weekStart: 0 | 1;
  size: Size;
  onChoose: (day: string) => void;
};

const navButton =
  "inline-flex size-control items-center justify-center rounded-control text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus";

/** One month as a table: the header with the arrows, then a row per week with a button per day. */
function Month({
  focused,
  onFocusedChange,
  value,
  today,
  min,
  max,
  weekStart,
  size,
  onChoose,
}: MonthProps) {
  const t = useTranslations("ui.datePicker");
  const format = useFormatter();
  const weeks = monthWeeks(focused, weekStart);
  const title = format.dateTime(utcNoon(focused), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const inRange = (day: string) =>
    (min === undefined || day >= min) && (max === undefined || day <= max);

  const move = (event: KeyboardEvent) => {
    const steps: Record<string, string> = {
      ArrowLeft: addDays(focused, -1),
      ArrowRight: addDays(focused, 1),
      ArrowUp: addDays(focused, -7),
      ArrowDown: addDays(focused, 7),
      Home: startOfWeek(focused, weekStart),
      End: addDays(startOfWeek(focused, weekStart), 6),
      PageUp: addMonths(focused, -1),
      PageDown: addMonths(focused, 1),
    };
    const next = steps[event.key];
    if (next !== undefined) {
      event.preventDefault();
      onFocusedChange(clampDate(next, min, max), true);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-3">
        <button
          type="button"
          aria-label={t("previousMonth")}
          onClick={() => onFocusedChange(clampDate(addMonths(focused, -1), min, max), false)}
          className={navButton}
        >
          <IconChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p aria-live="polite" className="text-field-label text-ink first-letter:uppercase">
          {title}
        </p>
        <button
          type="button"
          aria-label={t("nextMonth")}
          onClick={() => onFocusedChange(clampDate(addMonths(focused, 1), min, max), false)}
          className={navButton}
        >
          <IconChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <table aria-label={title} className="border-collapse">
        <thead>
          <tr>
            {(weeks[0] ?? []).map((day) => (
              <th
                key={day}
                scope="col"
                abbr={format.dateTime(utcNoon(day), { weekday: "long", timeZone: "UTC" })}
                className={cn(
                  "p-0 text-center text-label font-normal text-ink-muted",
                  cellSizes[size],
                )}
              >
                {format.dateTime(utcNoon(day), { weekday: "narrow", timeZone: "UTC" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const chosen = day === value;
                const allowed = inRange(day);
                return (
                  <td key={day} className="p-0">
                    <button
                      type="button"
                      data-date={day}
                      tabIndex={day === focused ? 0 : -1}
                      disabled={!allowed}
                      aria-label={format.dateTime(utcNoon(day), {
                        dateStyle: "full",
                        timeZone: "UTC",
                      })}
                      aria-current={day === today ? "date" : undefined}
                      aria-pressed={chosen}
                      onClick={() => onChoose(day)}
                      onKeyDown={move}
                      className={cn(
                        "rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                        "disabled:opacity-40",
                        cellSizes[size],
                        day.slice(0, 7) === focused.slice(0, 7) ? "text-ink" : "text-ink-muted",
                        day === today && !chosen && "border border-ink",
                        chosen ? "bg-action text-on-action" : allowed && "hover:bg-sunken",
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A date typed as dd/mm/aaaa or picked from a month. Typing is the fast path and stays a plain
 * input; the calendar button opens the month on the chosen day, or on today. In the month the arrow
 * keys move by a day or a week, Home and End to the ends of the week, Page Up and Page Down by a
 * month, Enter chooses. Days outside `min` and `max` cannot be chosen.
 */
export function DatePicker({
  value,
  onValueChange,
  today,
  min,
  max,
  weekStart = 0,
  disabled,
  size = "md",
  ...control
}: DatePickerProps) {
  const t = useTranslations("ui.datePicker");
  const [typed, setTyped] = useState(textOf(value));
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(isIsoDate(value) ? value : today);
  const panel = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    setTyped(textOf(value));
  }, [value]);

  useEffect(() => {
    if (open && moveFocus.current) {
      panel.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }
  }, [open, focused]);

  const type = (text: string) => {
    setTyped(text);
    const parsed = parseDate(text);
    // Inside the range means clamping leaves it where it is.
    onValueChange(parsed !== null && clampDate(parsed, min, max) === parsed ? parsed : "");
  };

  const choose = (day: string) => {
    onValueChange(day);
    setTyped(textOf(day));
    setOpen(false);
  };

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <MaskedInput
          {...control}
          mask={maskDate}
          value={typed}
          onValueChange={type}
          placeholder={t("placeholder")}
          disabled={disabled}
        />
      </div>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            moveFocus.current = true;
            setFocused(isIsoDate(value) ? value : clampDate(today, min, max));
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger
          disabled={disabled}
          aria-label={t("open")}
          className="inline-flex h-field w-field shrink-0 items-center justify-center rounded-control border-2 border-line-strong bg-surface text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
        >
          <IconCalendar className="size-5" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto"
          onOpenAutoFocus={(event) => {
            // The day goes to focus, not the first button in the panel.
            event.preventDefault();
            panel.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
          }}
        >
          <div ref={panel}>
            <Month
              focused={focused}
              onFocusedChange={(day, keepFocus) => {
                moveFocus.current = keepFocus;
                setFocused(day);
              }}
              value={value}
              today={today}
              min={min}
              max={max}
              weekStart={weekStart}
              size={size}
              onChoose={choose}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
