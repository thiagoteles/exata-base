/*
 * The values a sample part can take, declared once. The database enum is built from this list,
 * and the form in the browser reads it without pulling the database schema into the bundle.
 */
export const samplePartStatuses = ["open", "closed"] as const;
export type SamplePartStatus = (typeof samplePartStatuses)[number];
