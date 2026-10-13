import {
  type AttachmentsCheck,
  checkAttachments,
  safeAttachmentName,
} from "@/domain/email/attachments";
import type { EmailAttachment } from "./types";

const BYTES_PER_MB = 1_048_576;

export type PreparedAttachments =
  | { ok: true; attachments: readonly EmailAttachment[] | undefined }
  | { ok: false; check: Extract<AttachmentsCheck, { ok: false }> };

/**
 * The attachments as they will leave: names cleaned, and the total held to the cap. Over the cap the
 * send is refused whole and the check carries every file's size, so the caller can show them. The
 * cap counts the files themselves; the message the provider receives is about a third larger once
 * encoded, so the cap is a number to confirm against the provider's own limit.
 */
export function prepareAttachments(
  attachments: readonly EmailAttachment[] | undefined,
  maxMb: number,
): PreparedAttachments {
  if (attachments === undefined || attachments.length === 0) {
    return { ok: true, attachments: undefined };
  }
  const cleaned = attachments.map((file) => ({
    ...file,
    filename: safeAttachmentName(file.filename),
  }));
  const check = checkAttachments(
    cleaned.map((file) => ({ filename: file.filename, bytes: file.content.byteLength })),
    maxMb * BYTES_PER_MB,
  );
  return check.ok ? { ok: true, attachments: cleaned } : { ok: false, check };
}
