import type { IconUser } from "@tabler/icons-react";
import type { productNavIconNames } from "@/lib/navigation.product";

/*
 * How the shell draws each icon the product's navigation adds. The product owns this file; the
 * base adds no icon of its own here.
 */
export const productNavIcons: Readonly<
  Record<(typeof productNavIconNames)[number], typeof IconUser>
> = {};
