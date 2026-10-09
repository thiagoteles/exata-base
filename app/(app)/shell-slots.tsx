import { getTranslations } from "next-intl/server";
import { IdentifyAccount } from "@/components/identify-account";
import { BottomBar } from "@/components/shell/bottom-bar";
import type { ShellGroup, ShellItem } from "@/components/shell/nav-types";
import { Sidebar } from "@/components/shell/sidebar";
import { UserMenu } from "@/components/shell/user-menu";
import { ClaimVisitorData } from "@/features/account/claim-visitor-data";
import { ReportTimeZone } from "@/features/account/report-time-zone";
import { env } from "@/lib/env";
import { groupNav, type NavItem, splitForBar, visibleNav } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/ports/auth";
import { SignOutControl } from "@/lib/ports/auth/screens";
import { resolvePreferences } from "@/lib/preferences/resolve";

/*
 * The parts of the shell that depend on who is signed in. Each reads the session, so each sits
 * behind its own Suspense boundary and the frame around them stays in the static shell. Until the
 * row exists (a Clerk sign-in that beat the webhook) the shell shows the member destinations.
 */

async function destinations() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  const items = visibleNav(user?.role ?? "member");
  const label = (item: NavItem): ShellItem => ({
    key: item.key,
    href: item.href,
    icon: item.icon,
    label: t(`items.${item.key}` as never),
    ...(item.exact === undefined ? {} : { exact: item.exact }),
  });
  return { t, items, label };
}

export async function SidebarSlot() {
  const { t, items, label } = await destinations();
  const groups = groupNav(items);
  const shown: ShellGroup[] = groups.map(({ group, items: entries }) => ({
    key: group,
    // A lone group needs no heading: "General" above a single link only adds noise.
    label: groups.length > 1 ? t(`groups.${group}`) : null,
    items: entries.map(label),
  }));
  return <Sidebar groups={shown} label={t("side")} />;
}

export async function BottomBarSlot() {
  const { t, items, label } = await destinations();
  const { bar, more } = splitForBar(items);
  return (
    <BottomBar
      items={bar.map(label)}
      more={more.map(label)}
      label={t("bottom")}
      moreLabel={t("more")}
      moreTitle={t("moreTitle")}
    />
  );
}

const signOutClasses =
  "flex h-control w-full items-center rounded-cell px-3 text-left text-body text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-focus";

export async function UserMenuSlot() {
  const [nav, account, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("account"),
    getCurrentUser(),
  ]);
  if (user === null) {
    return null;
  }
  return (
    <>
      <ReportTimeZone saved={resolvePreferences(user.options).timeZone} />
      <ClaimVisitorData />
      {env.UMAMI_WEBSITE_ID === undefined ? null : <IdentifyAccount accountId={user.id} />}
      <UserMenu
        name={user.name}
        email={user.email}
        roleLabel={account(`roles.${user.role}`)}
        menuLabel={nav("userMenu")}
        accountLabel={nav("items.account")}
        signOut={<SignOutControl className={signOutClasses} />}
      />
    </>
  );
}
