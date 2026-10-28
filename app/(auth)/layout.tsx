import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { productAuthLayout } from "@/components/pages.product";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // A product's frame replaces the base's: its brand, its background, its layout.
  if (productAuthLayout !== null) {
    const Frame = productAuthLayout;
    return <Frame>{children}</Frame>;
  }
  return <BaseAuthLayout>{children}</BaseAuthLayout>;
}

function BaseAuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("site");
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 py-8 md:justify-center md:py-12">
      <Link
        href="/"
        className="text-block-title text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        {t("name")}
      </Link>
      <main className="flex w-full justify-center">{children}</main>
    </div>
  );
}
