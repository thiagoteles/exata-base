ALTER TYPE "public"."billing_interval" ADD VALUE 'yearly_once';--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "expiry_warned_at" timestamp with time zone;