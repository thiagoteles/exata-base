import { describe, expect, it } from "vitest";
import { contactStatus, contactSubject } from "@/lib/db/schema/contact";
import { contactStatuses, contactSubjects } from "./options";

describe("contact options", () => {
  it("are the same values as the database enums, in the same order", () => {
    expect([...contactSubjects]).toEqual(contactSubject.enumValues);
    expect([...contactStatuses]).toEqual(contactStatus.enumValues);
  });
});
