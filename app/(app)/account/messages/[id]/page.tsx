import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactRecord } from "@/features/contact/contact-record";
import { getContact } from "@/lib/contact/service";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myMessages");
  return { title: t("title"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function MyMessagePage({ params }: PageProps<"/account/messages/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Record params={params} />
    </div>
  );
}

async function Record({ params }: Pick<PageProps<"/account/messages/[id]">, "params">) {
  const { id } = await params;
  const t = await getTranslations("myMessages");
  const user = await requirePageRole("member", `/account/messages/${id}`);
  // The same record, but only a message this person wrote, and read-only: no staff controls.
  const message = await getContact(db, user, "mine", id);
  if (message === null) {
    notFound();
  }
  return (
    <>
      <PageHeader title={t("title")} />
      <ContactRecord
        message={message}
        canManage={false}
        timeZone={resolvePreferences(user.options).timeZone}
      />
    </>
  );
}
