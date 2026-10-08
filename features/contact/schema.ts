import { contactSubjects } from "@/lib/contact/options";
import { validationMessage, z } from "@/lib/validation";

const MIN_NAME = 2;
const MAX_NAME = 120;
const MIN_BODY = 10;
const MAX_BODY = 5000;

const required = { message: validationMessage("required") };

/* The contact form, checked in the browser for instant feedback and again on the server. */
export const contactSchema = z.object({
  name: z.string().trim().min(MIN_NAME).max(MAX_NAME),
  email: z.string().trim().min(1, required).pipe(z.email()),
  subject: z.enum(contactSubjects, { error: validationMessage("required") }),
  body: z.string().trim().min(MIN_BODY).max(MAX_BODY),
});

export const replySchema = z.object({
  id: z.uuid(),
  body: z.string().trim().min(1, required).max(MAX_BODY),
});
