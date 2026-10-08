/*
 * The values a message can take. They are plain lists so the form in the browser can use them
 * without pulling the database schema into the bundle; a test keeps them equal to the enums.
 */
export const contactSubjects = ["general", "support", "billing", "privacy"] as const;
export const contactStatuses = ["new", "in_progress", "answered", "archived"] as const;
