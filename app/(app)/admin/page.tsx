import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { productAdminHub } from "@/components/pages.product";
import { ListSkeleton } from "@/components/patterns/list-states";
import { AdminHub } from "@/features/admin/hub";
import { staffDestinations } from "@/lib/navigation";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.hub");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminHubPage() {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Hub />
      </Suspense>
    </div>
  );
}

/** Every staff and admin screen the person may open, the product's among them. */
async function Hub() {
  const [t, nav] = await Promise.all([getTranslations("admin.hub"), getTranslations("nav")]);
  const viewer = await requirePageRole("staff", "/admin");
  const destinations = staffDestinations(viewer.role).map((item) => {
    const about = `about.${item.key}` as never;
    return {
      key: item.key,
      href: item.href,
      icon: item.icon,
      label: nav(`items.${item.key}` as never),
      about: t.has(about) ? t(about) : null,
    };
  });
  const Drawn = productAdminHub ?? AdminHub;
  return <Drawn title={t("title")} subtitle={t("subtitle")} destinations={destinations} />;
}
