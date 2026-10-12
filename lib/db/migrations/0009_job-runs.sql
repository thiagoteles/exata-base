CREATE TABLE "job_runs" (
	"name" text PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone NOT NULL,
	"failed" integer NOT NULL,
	"ms" integer NOT NULL,
	CONSTRAINT "job_runs_counts" CHECK ("job_runs"."failed" >= 0 and "job_runs"."ms" >= 0)
);
