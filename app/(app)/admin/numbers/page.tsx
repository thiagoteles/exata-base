import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { currentInstant } from "@/domain/clock";
import { NumbersBoard } from "@/features/admin/numbers-board";
import { type RangeDays, rangeDays, readBusinessNumbers } from "@/lib/admin/numbers";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.numbers");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function NumbersPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Numbers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Numbers({ searchParams }: Props) {
  const t = await getTranslations("admin.numbers");
  const viewer = await requirePageRole("admin", "/admin/numbers");
  const asked = Number((await searchParams)["range"]);
  const range: RangeDays = rangeDays.find((days) => days === asked) ?? 30;
  // "Today" depends on the clock, which is read at request time only.
  await connection();
  const numbers = await readBusinessNumbers(db, viewer, range, currentInstant());
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <NumbersBoard numbers={numbers} range={range} />
    </>
  );
}
