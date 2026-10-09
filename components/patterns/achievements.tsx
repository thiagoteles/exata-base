import { IconLock, IconTrophy } from "@tabler/icons-react";
import { Progress } from "@/components/ui/progress";
import { Stamp } from "@/components/ui/stamp";

type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  /** For one still being worked toward: how far, and out of how much. */
  progress?: { value: number; max: number; label: string };
};

type AchievementsProps = {
  items: readonly Achievement[];
  /** Said beside an earned one, and beside a locked one, for a screen reader and the eye alike. */
  earnedText: string;
  lockedText: string;
};

/**
 * What a person has earned, as a ruled list: the earned ones carry a trophy and a stamp, the ones still
 * ahead a lock and, when there is a count toward them, a bar. Locked ones are shown on purpose: knowing
 * what is next is the reason to come back. Nothing here celebrates with motion.
 */
export function Achievements({ items, earnedText, lockedText }: AchievementsProps) {
  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {items.map((item) => {
        const status = item.earned ? earnedText : lockedText;
        return (
          <li
            key={item.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 py-4"
          >
            <span aria-hidden="true" className={item.earned ? "text-brand-ink" : "text-ink-muted"}>
              {item.earned ? <IconTrophy className="size-6" /> : <IconLock className="size-6" />}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p
                className={
                  item.earned ? "text-field-label text-ink" : "text-field-label text-ink-muted"
                }
              >
                {item.title}
              </p>
              <p className="max-w-[52ch] text-body-small text-ink-muted">{item.description}</p>
              {item.progress === undefined || item.earned ? null : (
                <div className="mt-1 max-w-xs">
                  <Progress
                    label={item.progress.label}
                    value={item.progress.value}
                    max={item.progress.max}
                    size="sm"
                    showValue
                  />
                </div>
              )}
            </div>
            <Stamp tone={item.earned ? "done" : "neutral"}>{status}</Stamp>
          </li>
        );
      })}
    </ul>
  );
}
