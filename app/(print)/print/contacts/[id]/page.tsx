import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PrintBar } from "@/components/print/print-bar";
import { ContactSheet } from "@/features/contact/contact-sheet";
import { getContact } from "@/lib/contact/service";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { readerOf } from "@/lib/reader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("print.contact");
  return { title: t("title"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function PrintContactPage({ params }: PageProps<"/print/contacts/[id]">) {
  return <Sheeted params={params} />;
}

/** The same guard and the same read as the record screen, so printing opens no new way to the data. */
async function Sheeted({ params }: Pick<PageProps<"/print/contacts/[id]">, "params">) {
  const { id } = await params;
  const user = await requirePageRole("staff", `/print/contacts/${id}`);
  const message = await getContact(db, user, "all", id);
  if (message === null) {
    notFound();
  }
  const reader = await readerOf(user);
  return (
    <>
      <PrintBar />
      <ContactSheet message={message} timeZone={reader.timeZone} printedOn={reader.now} />
    </>
  );
}
