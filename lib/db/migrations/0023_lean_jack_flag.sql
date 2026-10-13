ALTER TABLE "files" ADD COLUMN "subject_type" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "kind" text;--> statement-breakpoint
CREATE INDEX "files_owner_id_subject_type_subject_id_index" ON "files" USING btree ("owner_id","subject_type","subject_id");