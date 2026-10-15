import {
  IconActivityHeartbeat,
  IconChartBar,
  IconCreditCard,
  IconFolder,
  IconHistory,
  IconInbox,
  IconMail,
  IconSend,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import type { NavIcon as NavIconName } from "@/lib/navigation";
import { productNavIcons } from "./nav-icon.product";
import type { ShellItem } from "./nav-types";

const icons: Readonly<Record<NavIconName, typeof IconUser>> = {
  ...productNavIcons,
  user: IconUser,
  mail: IconMail,
  inbox: IconInbox,
  card: IconCreditCard,
  users: IconUsers,
  send: IconSend,
  history: IconHistory,
  chart: IconChartBar,
  pulse: IconActivityHeartbeat,
  folder: IconFolder,
};

export function NavIcon({ name }: { name: ShellItem["icon"] }) {
  const Icon = icons[name];
  return <Icon className="size-[1.125rem] shrink-0" stroke={1.75} aria-hidden="true" />;
}
