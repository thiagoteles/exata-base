import { inviteMessage } from "./invite-email";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function InvitePreview() {
  return inviteMessage({
    inviterEmail: "admin@example.com",
    role: "staff",
    url: "http://localhost:47300/sign-up?invite=token",
  }).element;
}
