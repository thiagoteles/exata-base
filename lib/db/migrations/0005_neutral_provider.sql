CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
ALTER TYPE "public"."plan_status" ADD VALUE 'trialing';--> statement-breakpoint
ALTER TYPE "public"."plan_status" ADD VALUE 'pending';--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "provider" "payment_provider";--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "provider_customer_id" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "provider_subscription_id" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "price_key" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "trial_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_providerCustomerId_unique" UNIQUE("provider_customer_id");--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_providerSubscriptionId_unique" UNIQUE("provider_subscription_id");