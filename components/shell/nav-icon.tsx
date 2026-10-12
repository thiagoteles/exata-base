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
import type { ShellItem } from "./nav-types";

const icons: Readonly<Record<NavIconName, typeof IconUser>> = {
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
  return <Icon className="size-5 shrink-0" aria-hidden="true" />;
}
