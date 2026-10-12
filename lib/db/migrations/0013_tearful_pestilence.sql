CREATE TYPE "public"."checkout_status" AS ENUM('open', 'pending', 'paid', 'expired', 'failed');--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_session_id" text NOT NULL,
	"interval" "billing_interval" NOT NULL,
	"status" "checkout_status" DEFAULT 'open' NOT NULL,
	"source" text NOT NULL,
	"currency" text,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_sessions_providerSessionId_unique" UNIQUE("provider_session_id")
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_sessions_user_id_index" ON "checkout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_created_at_index" ON "checkout_sessions" USING btree ("status","created_at");