import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatInstantDate } from "@/lib/date";
import type { listFiles } from "@/lib/files/service";

type FileRow = Awaited<ReturnType<typeof listFiles>>[number];

const BYTES_PER_KB = 1024;
const sizeText = (bytes: number) => `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} kB`;

/** The person's own files. The link goes to a route that answers with a short-lived signed URL. */
export async function FilesList({ files }: { files: readonly FileRow[] }) {
  const t = await getTranslations("catalog.files");
  if (files.length === 0) {
    return <p className="text-body text-ink-muted">{t("empty")}</p>;
  }
  return (
    <ul aria-label={t("list")} className="flex max-w-xl flex-col">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex min-h-row items-center justify-between gap-4 border-b border-line"
        >
          <Link
            href={`/catalog/files/${file.id}`}
            aria-label={t("download", { name: file.name })}
            className="min-w-0 truncate text-body font-semibold text-brand-ink underline"
          >
            {file.name}
          </Link>
          <span className="shrink-0 font-mono text-data tabular-nums text-ink-muted">
            {`${sizeText(file.sizeBytes)} · ${formatInstantDate(file.createdAt)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
