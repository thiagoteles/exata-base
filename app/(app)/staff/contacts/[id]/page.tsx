import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactRecord } from "@/features/contact/contact-record";
import { getContact } from "@/lib/contact/service";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function ContactPage({ params }: PageProps<"/staff/contacts/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Record params={params} />
    </div>
  );
}

async function Record({ params }: Pick<PageProps<"/staff/contacts/[id]">, "params">) {
  const { id } = await params;
  const printing = await getTranslations("print.contact");
  const user = await requirePageRole("staff", `/staff/contacts/${id}`);
  const message = await getContact(db, user, "all", id);
  if (message === null) {
    notFound();
  }
  const contact = await getTranslations("contact");
  const timeZone = resolvePreferences(user.options).timeZone;
  return (
    <>
      <PageHeader
        title={message.name}
        subtitle={`${contact(`subjects.${message.subject}`)} · ${formatInstantDate(message.createdAt, timeZone)}`}
        actions={[
          { key: "print", label: printing("action"), href: `/print/contacts/${id}` as Route },
        ]}
      />
      <ContactRecord message={message} canManage timeZone={timeZone} />
    </>
  );
}
