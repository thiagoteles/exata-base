import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorView } from "@/components/shell/error-view";
import { buttonClasses } from "@/components/ui/styles";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <ErrorView
      title={t("title")}
      body={t("body")}
      actions={
        <Link href="/" className={buttonClasses("primary")}>
          {t("home")}
        </Link>
      }
    />
  );
}
