"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { clearVisitorValue, readVisitorValue, writeVisitorValue } from "@/lib/browser-storage";

export type Draft = { subject: string; body: string };

const SAVE_AFTER_MS = 3000;
const KEY = "contactDraft";

type Values = { subject: string; body: string };

/**
 * Keeps what a person has typed and not sent. A visitor's draft lives in this browser and is handed
 * to the account when they sign in; a signed-in person's goes to their account, so it is waiting on
 * another device. It is saved once typing pauses, not on every key, and cleared when the message is sent.
 * `save` is how a signed-in draft reaches the server; it is not called for a visitor.
 */
export function useDraft(
  form: UseFormReturn<Values & Record<string, unknown>>,
  signedIn: boolean,
  save: (draft: Draft | null) => Promise<unknown>,
) {
  const last = useRef<string>("");
  // The caller passes a new function on every render; the timer must not restart because of that.
  const saveRef = useRef(save);
  saveRef.current = save;

  // A visitor's draft comes back once the page has mounted, if the form is still empty.
  useEffect(() => {
    if (signedIn) {
      return;
    }
    const held = readVisitorValue(KEY) as Draft | undefined;
    if (held !== undefined && form.getValues("body") === "") {
      form.setValue("subject", held.subject);
      form.setValue("body", held.body);
      last.current = JSON.stringify({ subject: held.subject, body: held.body });
    }
  }, [form, signedIn]);

  const subject = form.watch("subject");
  const body = form.watch("body");
  useEffect(() => {
    const current = JSON.stringify({ subject, body });
    if (current === last.current) {
      return;
    }
    const timer = setTimeout(() => {
      last.current = current;
      const empty = body.trim() === "" && subject === "";
      if (signedIn) {
        saveRef.current(empty ? null : { subject, body }).catch(() => undefined);
      } else if (empty) {
        clearVisitorValue(KEY);
      } else {
        writeVisitorValue(KEY, { subject, body });
      }
    }, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [subject, body, signedIn]);

  /** After the message is sent: nothing is left to resume. */
  return () => {
    last.current = "";
    if (signedIn) {
      saveRef.current(null).catch(() => undefined);
    } else {
      clearVisitorValue(KEY);
    }
  };
}
