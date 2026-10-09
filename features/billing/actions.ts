"use server";

import { catalog } from "@/domain/billing/catalog";
import { chooseCurrency, currenciesToOffer } from "@/domain/billing/currency";
import { trialDaysFor } from "@/domain/billing/trial";
import { actionFor } from "@/lib/actions/client";
import { canBuy, changeCancellation, readPlan } from "@/lib/billing/service";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { publicHref } from "@/lib/i18n/public-paths";
import { sendEvent } from "@/lib/ports/analytics";
import { readPrices, requireGateway } from "@/lib/ports/payment";
import { cancellationSchema, checkoutSchema } from "./schema";

/** Opens the provider's checkout for one plan and returns the address to send the person to. */
export const startCheckout = actionFor("member")
  .inputSchema(checkoutSchema)
  .metadata({ name: "startCheckout" })
  .action(async ({ parsedInput, ctx }) => {
    const gateway = await requireGateway();
    const prices = await readPrices();
    const price = prices[parsedInput.interval];
    if (price === undefined) {
      throw new DomainError(404, "planUnavailable");
    }
    // What is charged is what was shown, but only if the product offers it and this price carries it.
    const currency = chooseCurrency({
      preferred: parsedInput.currency,
      defaultCurrency: catalog.currencies.default,
      available: currenciesToOffer(catalog.currencies.offered, [price]),
    });
    const plan = await readPlan(db, ctx.user.id);
    if (!canBuy(plan, parsedInput.interval)) {
      throw new DomainError(409, "alreadyPaid");
    }
    // A trial is offered once per account, and only for a subscription.
    const trialDays = trialDaysFor({
      trial: catalog.trial,
      interval: parsedInput.interval,
      trialUsedAt: plan?.trialUsedAt ?? null,
    });
    const url = await gateway.createCheckout({
      userId: ctx.user.id,
      email: ctx.user.email,
      customerId: plan?.providerCustomerId ?? null,
      interval: parsedInput.interval,
      priceId: price.priceId,
      ...(trialDays > 0 ? { trialDays } : {}),
      ...(currency === undefined || currency === price.currency ? {} : { currency }),
      successUrl: `${env.APP_URL}/account/plan?checkout=success`,
      cancelUrl: `${env.APP_URL}${publicHref("/plans")}`,
    });
    sendEvent({
      name: "checkout_started",
      accountId: ctx.user.id,
      data: { interval: parsedInput.interval },
    });
    return { url };
  });

/** The customer portal, where the card and the invoices are managed. */
export const openPortal = actionFor("member")
  .metadata({ name: "openPortal" })
  .action(async ({ ctx }) => {
    const gateway = await requireGateway();
    const plan = await readPlan(db, ctx.user.id);
    if (plan?.providerCustomerId === null || plan === null) {
      throw new DomainError(409, "noBillingAccount");
    }
    return {
      url: await gateway.createPortal(plan.providerCustomerId, `${env.APP_URL}/account/plan`),
    };
  });

export const setCancellation = actionFor("member")
  .inputSchema(cancellationSchema)
  .metadata({ name: "setCancellation" })
  .action(async ({ parsedInput, ctx }) => {
    const gateway = await requireGateway();
    await changeCancellation(db, ctx.user.id, parsedInput.cancel, gateway.setCancelAtPeriodEnd);
    return { cancel: parsedInput.cancel };
  });
