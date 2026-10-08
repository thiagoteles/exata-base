import { verifyEmailMessage } from "./account-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function VerifyEmailPreview() {
  return verifyEmailMessage({ name: "Ana", url: "http://localhost:3300/api/auth/verify-email" })
    .element;
}
