import { contactReplyMessage } from "./contact-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function ContactReplyPreview() {
  return contactReplyMessage({
    name: "Ana",
    reply: "Olá! O arquivo fica na página da conta.",
    original: "Não consigo baixar meus dados.",
  }).element;
}
