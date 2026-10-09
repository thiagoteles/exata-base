---
name: new-payment-event
description: Handle one more payment provider event. Use when billing must react to something Stripe reports, such as a dispute, a trial ending or a plan change.
---

# New payment event

The reference is the whole path of an event: `lib/ports/payment/adapters/stripe.ts` reads it,
`lib/billing/service.ts` applies it, `app/api/webhooks/stripe/route.ts` receives it. A provider event
never reaches the billing rules as the provider's own type.

1. **Name what happened, not what Stripe called it.** Add a variant to `PaymentEvent` in
   `lib/ports/payment/types.ts` with only the facts the rule needs (`subscriptionId`, `customerId`,
   a flag). Every variant also carries the event `id` and `type`.
2. **Read it in the adapter.** Add the `case` to `toPaymentEvent`. Anything missing that the rule
   needs (no user, no customer) becomes `{ kind: "ignored" }`, never a throw: a throw makes Stripe
   retry the same delivery for days.
3. **Apply it in the service.** Add the `case` to `applyEvent`, returning `null` unless it records a
   payment for the first time (that one comes back as `newPayment`, which the route counts in the
   funnel). The compiler stops at the `never` branch until every variant is handled. Rules:
   - The change happens inside the transaction that already holds the replay lock, so a delivery
     seen before does nothing and a failed change leaves the event unseen for the retry.
   - A call to the provider (such as ending a subscription) is made through the function handed in,
     after the database write and still inside the transaction. If it fails, everything rolls back.
   - Match by the provider's ids (`stripe_subscription_id`, `stripe_customer_id`), never by e-mail.
     An id that matches no row is not an error: the event is about something already gone.
   - Keep access rules in one place. `grantsAccess` is the only function that says who has paid.
4. **Subscribe to it.** Add the event to the endpoint in the Stripe dashboard (or the CLI listener),
   or it never arrives.
5. **Test it with a signed event.** Add a builder to `tests/integration/stripe-events.ts` and cases
   to `tests/integration/billing.test.ts`: the effect, the same delivery twice, an id that matches
   nothing, and a failing provider call rolling back. `billingFixture` signs, verifies through the
   real adapter and applies.
