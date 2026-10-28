import type { ComponentType } from "react";
import type { AppShellProps } from "./app-shell";
import type { BottomBarProps } from "./bottom-bar";
import type { SidebarProps } from "./sidebar";
import type { UserAreaProps } from "./user-menu";

/*
 * The product's own frame, sidebar and bottom bar for the signed-in area, in place of the base's.
 * Each receives what the base's receives: the destinations are already resolved for the person
 * and translated, so the product only decides how they look. The product owns this file; the base
 * ships it empty and draws its own.
 */

export const productAppShell: ComponentType<AppShellProps> | null = null;

export const productSidebar: ComponentType<SidebarProps> | null = null;

export const productBottomBar: ComponentType<BottomBarProps> | null = null;

/** The end of the top bar: the theme switch and the person's menu, drawn by the product. */
export const productUserArea: ComponentType<UserAreaProps> | null = null;
