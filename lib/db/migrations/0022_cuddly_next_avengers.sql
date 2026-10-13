CREATE TYPE "public"."exchange_quote_status" AS ENUM('found', 'none');--> statement-breakpoint
CREATE TABLE "exchange_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"currency" text NOT NULL,
	"quote_day" date NOT NULL,
	"status" "exchange_quote_status" NOT NULL,
	"buy_rate" text,
	"sell_rate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_quotes_source_currency_quote_day_index" ON "exchange_quotes" USING btree ("source","currency","quote_day");