import type { Role } from "@/lib/accounts/roles";
import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { ActionEmail } from "./action-email";

type InviteInput = { inviterEmail: string; role: Role; url: string };

/** Goes to the invited address, with the link that opens sign-up with that address filled in. */
export function inviteMessage(
  { inviterEmail, role, url }: InviteInput,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("invite.subject"),
    element: (
      <ActionEmail
        preview={t("invite.preview")}
        greeting={t("invite.greeting")}
        body={t("invite.body", { inviter: inviterEmail, role: t(`invite.roles.${role}`) })}
        action={t("invite.action")}
        url={url}
        ignore={t("invite.ignore")}
        footer={t("layout.footer")}
      />
    ),
  };
}
