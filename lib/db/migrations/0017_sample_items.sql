CREATE TYPE "public"."sample_items_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "sample_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"status" "sample_items_status" DEFAULT 'open' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sample_items_code_shape" CHECK ("sample_items"."code" ~ '^[A-Z0-9-]{1,20}$')
);
--> statement-breakpoint
ALTER TABLE "sample_items" ADD CONSTRAINT "sample_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sample_items_owner_id_name_index" ON "sample_items" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "sample_items_owner_id_created_at_index" ON "sample_items" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sample_items_owner_id_code_index" ON "sample_items" USING btree ("owner_id","code") WHERE "sample_items"."code" is not null;