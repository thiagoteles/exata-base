/*
 * What may travel attached to a message. A message has one cap on the total size of its attachments,
 * so a send that is too big is refused whole, with the size of each file, and the person decides
 * what to drop. A file name is cleaned before it reaches a header: no path, no control characters.
 */

export type AttachmentSize = { filename: string; bytes: number };

export type AttachmentsCheck =
  | { ok: true; totalBytes: number }
  | { ok: false; totalBytes: number; maxBytes: number; files: readonly AttachmentSize[] };

/** Whether the files fit the cap. On a refusal it carries every file's size, largest first. */
export function checkAttachments(
  files: readonly AttachmentSize[],
  maxBytes: number,
): AttachmentsCheck {
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  if (totalBytes <= maxBytes) {
    return { ok: true, totalBytes };
  }
  return {
    ok: false,
    totalBytes,
    maxBytes,
    files: [...files].sort((a, b) => b.bytes - a.bytes),
  };
}

const MAX_NAME_CHARACTERS = 120;
const FALLBACK_NAME = "file";
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what this removes
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f/\\:*?"<>|]+/g;
const EDGES = /^[\s.]+|[\s.]+$/g;
const ONLY_FILLER = /^_+$/;

/** A name safe to put in a header and on a disk: no path, no control character, at most 120 characters. */
export function safeAttachmentName(name: string): string {
  const cleaned = name.replace(UNSAFE_CHARACTERS, "_").replace(EDGES, "");
  if (cleaned === "" || ONLY_FILLER.test(cleaned)) {
    return FALLBACK_NAME;
  }
  if (cleaned.length <= MAX_NAME_CHARACTERS) {
    return cleaned;
  }
  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : "";
  return `${cleaned.slice(0, MAX_NAME_CHARACTERS - extension.length)}${extension}`;
}
