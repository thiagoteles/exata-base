import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { currentInstant } from "@/domain/clock";
import { HealthBoard } from "@/features/admin/health-board";
import { readHealth } from "@/lib/admin/health";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.health");
  return { title: t("title"), robots: { index: false } };
}

export default function HealthPage() {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Health />
      </Suspense>
    </div>
  );
}

async function Health() {
  const t = await getTranslations("admin.health");
  const viewer = await requirePageRole("admin", "/admin/health");
  // Lateness and the database's answer are about this moment, so the page renders per request.
  await connection();
  const now = currentInstant();
  const health = await readHealth(db, viewer, now);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <HealthBoard
        health={health}
        now={now}
        release={{ service: env.SERVICE_NAME, commit: env.SOURCE_COMMIT ?? null }}
      />
    </>
  );
}
