CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referred_id" uuid NOT NULL,
	"referrer_id" uuid,
	"referrer_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referredId_unique" UNIQUE("referred_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" text DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12) NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_index" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referralCode_unique" UNIQUE("referral_code");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_format" CHECK ("users"."referral_code" ~ '^[a-z0-9]{12}$');