/*
 * The values a sample item can take, declared once. The database enum is built from this list,
 * and the form in the browser reads it without pulling the database schema into the bundle.
 */
export const sampleItemStatuses = ["open", "closed"] as const;
export type SampleItemStatus = (typeof sampleItemStatuses)[number];
