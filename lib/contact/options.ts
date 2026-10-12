/*
 * The values a message can take, declared once. The database enums are built from these lists,
 * and the form in the browser reads them without pulling the database schema into the bundle.
 */
export const contactSubjects = ["general", "support", "billing", "privacy"] as const;
export const contactStatuses = ["new", "in_progress", "answered", "archived"] as const;
