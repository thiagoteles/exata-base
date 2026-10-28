import type { ComponentType } from "react";
import type { AuthLayoutProps, AuthScreenProps } from "@/components/patterns/auth-frame";
import type { SectionedPageProps } from "@/components/patterns/sectioned-page";

/*
 * The product's own presentation of the base's screens: the account, the plan, and the sign-in
 * and sign-up frame. The base still reads the data, guards the page and draws each section's
 * controls; a product only decides which sections show, in which order and how they look. The
 * product owns this file; the base ships it empty and draws its own.
 */

/** The account page, given its sections (profile, theme, devices, deletion...) already drawn. */
export const productAccountPage: ComponentType<SectionedPageProps> | null = null;

/** The plan page, given its sections (the plan, the trial, the actions, the receipts) already drawn. */
export const productPlanPage: ComponentType<SectionedPageProps> | null = null;

/** What surrounds the sign-in and sign-up screens: the brand, the background, the layout. */
export const productAuthLayout: ComponentType<AuthLayoutProps> | null = null;

/** The sign-in or sign-up screen itself in Clerk mode, in place of the hosted one. */
export const productAuthScreen: ComponentType<AuthScreenProps> | null = null;
