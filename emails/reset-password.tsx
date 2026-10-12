import { resetPasswordMessage } from "./account-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function ResetPasswordPreview() {
  return resetPasswordMessage({ name: "Ana", url: "http://localhost:47300/reset-password" })
    .element;
}
