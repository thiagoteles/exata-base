ALTER TABLE "stripe_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "stripe_events" CASCADE;--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_stripeCustomerId_unique";--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_stripeSubscriptionId_unique";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "stripe_subscription_id";