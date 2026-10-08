-- Every account starts on the free plan, whichever auth mode inserted the user row.
CREATE FUNCTION "create_free_plan"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO "plans" ("user_id") VALUES (NEW."id") ON CONFLICT DO NOTHING;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "users_create_free_plan" AFTER INSERT ON "users" FOR EACH ROW EXECUTE FUNCTION "create_free_plan"();
