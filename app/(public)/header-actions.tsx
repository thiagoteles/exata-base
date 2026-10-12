import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/styles";
import { getCurrentUser } from "@/lib/ports/auth";

export function SignedOutActions() {
  const t = useTranslations("nav");
  return (
    <>
      <Link href="/sign-in" className={buttonClasses("secondary")}>
        {t("signIn")}
      </Link>
      <Link href="/sign-up" className={`${buttonClasses("primary")} max-sm:hidden`}>
        {t("signUp")}
      </Link>
    </>
  );
}

function AccountLink() {
  const t = useTranslations("nav");
  return (
    <Link href="/account" className={buttonClasses("primary")}>
      {t("account")}
    </Link>
  );
}

/** Reads the session, so it streams in behind a Suspense boundary and the rest of the header stays static. */
export async function HeaderActions() {
  return (await getCurrentUser()) === null ? <SignedOutActions /> : <AccountLink />;
}
