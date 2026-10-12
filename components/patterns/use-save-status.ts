import { useEffect, useRef, useState } from "react";

export type SaveStatus = "clean" | "dirty" | "saving" | "saved";

const SAVED_STAMP_MS = 2000;

/**
 * The state behind the save bar. `dirty` comes from the form. `save` runs the action and, when it
 * succeeds, shows the "Saved" stamp for two seconds; a failure goes back to dirty so the person
 * can try again, with the error shown on the screen where it belongs.
 */
export function useSaveStatus(dirty: boolean, save: () => Promise<boolean>) {
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const idle: SaveStatus = dirty ? "dirty" : "clean";
  const status: SaveStatus = phase === "idle" ? idle : phase;

  const run = async () => {
    setPhase("saving");
    const ok = await save();
    if (!ok) {
      setPhase("idle");
      return;
    }
    setPhase("saved");
    timer.current = setTimeout(() => setPhase("idle"), SAVED_STAMP_MS);
  };

  return { status, save: run };
}
