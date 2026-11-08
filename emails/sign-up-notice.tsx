import { signUpNoticeMessage } from "./sign-up-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function SignUpNoticePreview() {
  return signUpNoticeMessage({
    name: "Ana Souza",
    email: "ana@example.com",
    date: "07/11/2026",
    time: "14:32",
    total: 213,
    url: "http://localhost:47300/admin/users/1",
  }).element;
}
