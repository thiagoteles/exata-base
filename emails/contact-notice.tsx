import { contactNoticeMessage } from "./contact-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function ContactNoticePreview() {
  return contactNoticeMessage({
    name: "Ana Souza",
    email: "ana@example.com",
    subjectLabel: "Suporte",
    body: "Não consigo baixar meus dados.",
    url: "http://localhost:3300/staff/contacts/1",
  }).element;
}
