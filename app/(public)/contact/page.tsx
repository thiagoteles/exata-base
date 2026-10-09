import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ContactForm } from "@/features/contact/contact-form";
import { getCurrentUser } from "@/lib/ports/auth";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return await buildSocialMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/contact",
  });
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <div className="mx-auto w-full max-w-180 px-4 py-12 md:py-18">
      <h1 className="text-page-title text-ink">{t("title")}</h1>
      <p className="mt-2 mb-8 text-body text-ink-muted">{t("subtitle")}</p>
      <Suspense>
        <Form />
      </Suspense>
    </div>
  );
}

/** Reads the session, so it streams in; a signed-in person arrives with name and e-mail filled in. */
async function Form() {
  const user = await getCurrentUser();
  return <ContactForm signedIn={user === null ? null : { name: user.name, email: user.email }} />;
}
