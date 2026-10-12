import type { ReactNode } from "react";

type ErrorViewProps = { title: string; body: string; code?: string; actions: ReactNode };

/** The page for an error or a missing page: what happened, what to do next, and a code to quote. */
export function ErrorView({ title, body, code, actions }: ErrorViewProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-170 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-page-title text-ink">{title}</h1>
      <p className="text-body text-ink">{body}</p>
      {code === undefined ? null : <p className="font-mono text-data text-ink-muted">{code}</p>}
      <div className="mt-2 flex flex-wrap gap-3">{actions}</div>
    </main>
  );
}
