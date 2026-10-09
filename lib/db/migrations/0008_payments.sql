CREATE TYPE "public"."payment_status" AS ENUM('paid', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"provider_customer_id" text,
	"payer_id" uuid,
	"payer_email" text,
	"amount_cents" integer NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"method" text,
	"status" "payment_status" DEFAULT 'paid' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_providerPaymentId_unique" UNIQUE("provider_payment_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0),
	CONSTRAINT "payments_refund_within_amount" CHECK ("payments"."refunded_cents" between 0 and "payments"."amount_cents"),
	CONSTRAINT "payments_currency_lowercase" CHECK ("payments"."currency" = lower("payments"."currency"))
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_payer_id_index" ON "payments" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "payments_provider_customer_id_index" ON "payments" USING btree ("provider_customer_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_index" ON "payments" USING btree ("paid_at");