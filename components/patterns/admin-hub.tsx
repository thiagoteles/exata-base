import type { Route } from "next";
import type { NavIcon } from "@/lib/navigation";

/** A staff or admin screen as the hub lists it: already named, and described when it has words for it. */
export type HubDestination = {
  key: string;
  href: Route;
  label: string;
  about: string | null;
  icon: NavIcon;
};

/** What the hub page draws, the base's or a product's: its title and every screen the person may open. */
export type AdminHubProps = {
  title: string;
  subtitle: string;
  destinations: readonly HubDestination[];
};
