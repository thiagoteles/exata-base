import {
  IconCreditCard,
  IconHistory,
  IconInbox,
  IconMail,
  IconSend,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import type { ShellItem } from "./nav-types";

const icons = {
  user: IconUser,
  mail: IconMail,
  inbox: IconInbox,
  card: IconCreditCard,
  users: IconUsers,
  send: IconSend,
  history: IconHistory,
} as const;

export function NavIcon({ name }: { name: ShellItem["icon"] }) {
  const Icon = icons[name];
  return <Icon className="size-5 shrink-0" aria-hidden="true" />;
}
