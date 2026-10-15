-- The samples' tables leave the base's stream and stay in the database: from here the product's
-- stream (lib/db/product-migrations) owns them, and its first migration takes them over as they are.
-- Nothing changes in the database, so this migration runs no statement of its own.
SELECT 1;
