import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PrintBar } from "@/components/print/print-bar";
import { currentInstant } from "@/domain/clock";
import { ContactSheet } from "@/features/contact/contact-sheet";
import { getContact } from "@/lib/contact/service";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("print.contact");
  return { title: t("title"), robots: { index: false } };
}

export default function PrintContactPage({ params }: PageProps<"/print/contacts/[id]">) {
  return (
    <Suspense>
      <Sheeted params={params} />
    </Suspense>
  );
}

/** The same guard and the same read as the record screen, so printing opens no new way to the data. */
async function Sheeted({ params }: Pick<PageProps<"/print/contacts/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const user = await requirePageRole("staff", `/print/contacts/${id}`);
  const message = await getContact(db, user, "all", id);
  if (message === null) {
    notFound();
  }
  return (
    <>
      <PrintBar />
      <ContactSheet
        message={message}
        timeZone={resolvePreferences(user.options).timeZone}
        printedOn={currentInstant()}
      />
    </>
  );
}
