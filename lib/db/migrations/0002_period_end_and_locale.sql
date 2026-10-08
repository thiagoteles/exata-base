ALTER TABLE "plans" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "locale" text DEFAULT 'pt-BR' NOT NULL;