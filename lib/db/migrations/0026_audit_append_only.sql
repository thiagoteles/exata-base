-- An audit row is a fact. The application role can still disable the trigger with DDL;
-- this stops an ordinary update or delete, including one from the app's own queries.
CREATE FUNCTION "reject_audit_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'audit rows are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "staff_audit_log_append_only" BEFORE UPDATE OR DELETE ON "staff_audit_log" FOR EACH ROW EXECUTE FUNCTION "reject_audit_change"();--> statement-breakpoint
CREATE TRIGGER "account_deletions_append_only" BEFORE UPDATE OR DELETE ON "account_deletions" FOR EACH ROW EXECUTE FUNCTION "reject_audit_change"();
