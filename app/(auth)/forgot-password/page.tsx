import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { env } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordScreen />
    </Suspense>
  );
}

// Read per request: prerendered, the page would keep the provider of the build, which has none.
async function ForgotPasswordScreen() {
  await connection();
  if (env.AUTH_PROVIDER === "clerk") {
    // Clerk's own sign-in screen has the "forgot password" step.
    redirect("/sign-in");
  }
  return <ForgotPasswordForm />;
}
