-- Lock the application tables away from the public PostgREST roles.
--
-- Two independent things are wrong by default on a Prisma-created Supabase
-- schema, and this migration fixes both:
--
--   1. Prisma does not enable Row Level Security, so every table was
--      unrestricted.
--   2. Supabase's default privileges grant `anon` and `authenticated` full
--      DML on new tables in `public`, and PostgREST exposes them over HTTP.
--
-- Together those made every table readable *and writable* by anyone holding
-- the anon key — which is public by design and shipped to the browser.
--
-- All application data access goes through Prisma (see
-- frontend/src/lib/supabase/actions.ts), which connects as the table owner and
-- is therefore unaffected by RLS. Supabase is used only for auth.*, which
-- lives in the `auth` schema and is untouched here. So enabling RLS with no
-- policies is deny-by-default for the REST API and a no-op for the app.
--
-- If you later want to read a table directly from the browser via
-- supabase-js, add an explicit policy for it — do not disable RLS.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "electrician_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fault_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

-- Belt and braces: RLS alone already denies these roles, but removing the
-- grants means a future table-level policy can't accidentally re-open write
-- access that was never intended.
REVOKE ALL ON "users" FROM anon, authenticated;
REVOKE ALL ON "electrician_profiles" FROM anon, authenticated;
REVOKE ALL ON "locations" FROM anon, authenticated;
REVOKE ALL ON "fault_reports" FROM anon, authenticated;
REVOKE ALL ON "jobs" FROM anon, authenticated;
REVOKE ALL ON "certificates" FROM anon, authenticated;
REVOKE ALL ON "reviews" FROM anon, authenticated;
REVOKE ALL ON "receipts" FROM anon, authenticated;
REVOKE ALL ON "subscriptions" FROM anon, authenticated;

-- Prisma's own bookkeeping table should never have been reachable either.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "_prisma_migrations" FROM anon, authenticated;

-- Stop the same thing happening to tables added by future migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
