import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { env } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  if (env.AUTH_PROVIDER === "clerk") {
    // Clerk's own sign-in screen has the "forgot password" step.
    redirect("/sign-in");
  }
  return <ForgotPasswordForm />;
}
