ALTER TABLE "referrals" ADD COLUMN "rewarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "reward_cents" integer;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "reward_currency" text;