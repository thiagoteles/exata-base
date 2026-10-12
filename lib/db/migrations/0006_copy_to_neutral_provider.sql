-- Copies the provider ids into the neutral columns before the Stripe-named ones are dropped.
-- A plan bought through Stripe keeps its customer; the price key is the catalog's tier and interval.
UPDATE "plans" SET
	"provider" = CASE WHEN "stripe_customer_id" IS NOT NULL THEN 'stripe'::"payment_provider" END,
	"provider_customer_id" = "stripe_customer_id",
	"provider_subscription_id" = "stripe_subscription_id",
	"price_key" = CASE WHEN "tier" = 'paid' AND "billing_interval" IS NOT NULL AND "courtesy_reason" IS NULL
		THEN 'paid.' || "billing_interval"::text END;--> statement-breakpoint
INSERT INTO "payment_events" ("id", "provider", "type", "received_at")
	SELECT "id", 'stripe', "type", "received_at" FROM "stripe_events"
	ON CONFLICT DO NOTHING;
