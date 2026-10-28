import Link from "next/link";
import { useTranslations } from "next-intl";
import { productHeaderActions } from "@/components/shell/public-chrome.product";
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
  const signedIn = (await getCurrentUser()) !== null;
  if (productHeaderActions !== null) {
    const Actions = productHeaderActions;
    return <Actions signedIn={signedIn} />;
  }
  return signedIn ? <AccountLink /> : <SignedOutActions />;
}
