---
name: new-payment-event
description: Handle one more payment provider event. Use when billing must react to something Stripe reports, such as a dispute, a trial ending, a payment that arrives late or a plan change.
---

# New payment event

The whole path of an event: `lib/ports/payment/adapters/stripe-events.ts` reads it (`toPaymentEvent`),
`lib/billing/events.ts` applies it (`applyEvent`), `app/api/webhooks/stripe/route.ts` receives it and
does what the event caused once it is committed. A provider event never reaches the billing rules as the
provider's own type.

What the base already handles, so a new event is not one of these: `checkout.session.completed` and
`async_payment_succeeded` (`checkout_paid`, with the trial and the one-year term), a completed session
still unpaid (`checkout_pending`), `async_payment_failed` and `expired` (`checkout_failed`),
`invoice.payment_succeeded` and `payment_failed`, `customer.subscription.deleted` and `trial_will_end`,
`charge.succeeded`, `charge.refunded` and `charge.dispute.created`, and `price.created`, `updated` and
`deleted` (`prices_changed`, which only expires the price cache).

1. **Name what happened, not what Stripe called it.** Add a variant to `PaymentEvent` in
   `lib/ports/payment/types.ts` with only the facts the rule needs (`subscriptionId`, `customerId`,
   `sessionId`, a flag). Every variant also carries the event `id` and `type`.
2. **Read it in the adapter.** Add the `case` to `toPaymentEvent`. Anything missing that the rule
   needs (no user, no customer) becomes `{ kind: "ignored" }`, never a throw: a throw makes Stripe
   retry the same delivery for days.
3. **Apply it in `events.ts`.** Add the `case` to `applyEvent`. It returns `Effects`: spread `none` and
   fill only what the event caused (`newPayment`, `trialStarted`, `refund`, `trialEnding`, `dispute`,
   `checkoutCompleted`). The compiler stops at the `never` branch until every variant is handled. Rules:
   - The change happens inside the transaction that already holds the replay lock, so a delivery
     seen before does nothing and a failed change leaves the event unseen for the retry.
   - A call to the provider (such as ending a subscription) is made through the function handed in,
     after the database write and still inside the transaction. If it fails, everything rolls back.
   - Match by the provider's ids (subscription, customer, session), never by e-mail. An id that
     matches no row is not an error: the event is about something already gone.
   - Only move a record forward from the states it can leave (a checkout still open or pending, a plan
     that is `pending`), so a late or repeated event cannot undo something that finished.
   - Keep access rules in one place: `entitlementsOf` in `domain/billing/entitlements.ts` is the only
     function that says who has paid, and a new kind of plan changes it, not a screen.
4. **Do what it caused in the webhook route**, after the commit, in `announce`: count an analytics event
   (declared in `lib/analytics-events.ts`), send an e-mail, log an error that must be seen. Never in the
   transaction, and never something that can fail the delivery: a failure there is logged and the daily
   operation that covers it tries again (see `new-scheduled-operation`).
5. **Subscribe to it.** Add the event to the endpoint in the Stripe dashboard (or `stripe listen
   --events`), or it never arrives. Say so in the README row for the webhook.
6. **Test it with a signed event.** Add a builder to `tests/integration/stripe-events.ts` and cases to
   a test beside `tests/integration/billing.test.ts`: the effect, the same delivery twice (`duplicate`,
   no effects), an id that matches nothing, and a failing provider call rolling back. `billingFixture`
   signs, verifies through the real adapter, applies, and returns the effects. Then prove it once with a
   real event: `stripe trigger <event> --api-key <test key>` with a listener forwarding to the local app,
   keeping the listener's output out of the conversation (it prints the signing secret).
