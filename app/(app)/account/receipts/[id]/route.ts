import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { receiptNumber } from "@/domain/documents/receipt";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { qrPngDataUri } from "@/lib/documents/qr";
import { renderReceipt } from "@/lib/documents/receipt-document";
import { receiptForPayer } from "@/lib/documents/receipts";
import { signDocument } from "@/lib/documents/slug";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { withErrorResponse } from "@/lib/http";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatMoney, toCents } from "@/lib/money";
import { requireUser } from "@/lib/ports/auth";
import { attachmentDisposition } from "@/lib/ports/storage/attachment";
import { resolvePreferences } from "@/lib/preferences/resolve";
import { timedRoute } from "@/lib/timed-route";
import { z } from "@/lib/validation";

const knownMethods: readonly string[] = ["card", "pix", "boleto"];

/** A receipt for one of the signed-in person's own paid payments, as a PDF with a QR code that confirms it. */
export const GET = timedRoute(
  "/account/receipts/[id]",
  (_request: NextRequest, { params }: RouteContext<"/account/receipts/[id]">) =>
    withErrorResponse(async () => {
      const user = await requireUser();
      const id = z.uuid().safeParse((await params).id);
      if (!id.success) {
        throw new DomainError(404);
      }
      const facts = await receiptForPayer(db, user.id, id.data);
      const t = await getTranslations("documents.receipt");
      const slug = signDocument(env.DOCUMENT_SECRET, { kind: "receipt", id: facts.id });
      const verifyAddress = `${env.APP_URL}${publicHref("/verify/[slug]", { slug })}`;
      const number = receiptNumber(facts.id);
      const method =
        facts.method !== null && knownMethods.includes(facts.method) ? facts.method : "unknown";
      const pdf = await renderReceipt({
        labels: {
          title: t("title"),
          number: t("number"),
          payer: t("payer"),
          amount: t("amount"),
          date: t("date"),
          method: t("method"),
          verifyTitle: t("verifyTitle"),
          verifyHelp: t("verifyHelp"),
        },
        values: {
          number,
          payer: user.name.trim() || user.email,
          amount: formatMoney(toCents(facts.amountCents), facts.currency),
          date: formatInstantDate(facts.paidAt, resolvePreferences(user.options).timeZone),
          method: t(`methods.${method as "card" | "pix" | "boleto" | "unknown"}`),
        },
        qrDataUri: await qrPngDataUri(verifyAddress),
        verifyAddress,
      });
      return new Response(new Uint8Array(pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": attachmentDisposition(`recibo-${number}.pdf`),
          "cache-control": "private, no-store",
        },
      });
    }),
);
