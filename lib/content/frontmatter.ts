import { z } from "@/lib/validation";

/*
 * The YAML block at the top of every article. Checked twice: by the content script, which writes
 * the index and fails `pnpm check` on a bad file, and by the page, which renders the module. A typo
 * in a date or a missing title stops the build instead of shipping an empty page.
 */
export const frontmatterSchema = z.strictObject({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  publishedAt: z.iso.date(),
  updatedAt: z.iso.date().optional(),
  author: z.string().min(1),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
