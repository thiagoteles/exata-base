-- Deleting an account sets the author column of its audit rows to null (the foreign key's
-- ON DELETE SET NULL), which the append-only trigger refused, so no author could be deleted. The
-- trigger now takes the author column as its argument and lets through exactly that update: the
-- column going to null with every other column unchanged.
CREATE OR REPLACE FUNCTION "reject_audit_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'UPDATE' AND TG_NARGS = 1
		AND to_jsonb(OLD) ->> TG_ARGV[0] IS NOT NULL
		AND to_jsonb(NEW) ->> TG_ARGV[0] IS NULL
		AND to_jsonb(NEW) - TG_ARGV[0] = to_jsonb(OLD) - TG_ARGV[0] THEN
		RETURN NEW;
	END IF;
	RAISE EXCEPTION 'audit rows are append-only';
END;
$$;--> statement-breakpoint
DROP TRIGGER "staff_audit_log_append_only" ON "staff_audit_log";--> statement-breakpoint
CREATE TRIGGER "staff_audit_log_append_only" BEFORE UPDATE OR DELETE ON "staff_audit_log" FOR EACH ROW EXECUTE FUNCTION "reject_audit_change"('actor_id');
