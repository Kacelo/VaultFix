/**
 * Creates the relational `users` row for any Supabase auth account that has
 * none, defaulting to CLIENT.
 *
 * Why these exist: OAuth and magic-link sign-ins never passed through the
 * register form, so `syncUserProfile` was never called for them and they ended
 * up with a valid session and no database row — getCurrentUser() returns null,
 * and the dashboard tells a signed-in person to sign in. The app-side fix is
 * `ensureCurrentUserProfile`, which runs in the OAuth callback; this script is
 * for accounts stranded BEFORE that shipped.
 *
 *   pnpm backfill-profiles           # dry run, writes nothing
 *   pnpm backfill-profiles --apply   # create the missing rows
 *
 * Create-only: an account that already has a row is never touched, so it can
 * never rewrite an electrician's or admin's role.
 */
import "dotenv/config";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

// The Supabase keys live in .env.local; dotenv only reads .env.
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const apply = process.argv.includes("--apply");

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Neither DIRECT_URL nor DATABASE_URL is set — expected them in .env at the repository root.");
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.local).");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const existing = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  const missing = data.users.filter((u) => !existing.has(u.id));

  if (missing.length === 0) {
    console.log("Every auth account has a profile. Nothing to do.");
    return;
  }

  console.log(`${missing.length} account(s) with no profile:\n`);

  for (const u of missing) {
    if (!u.email) {
      console.log(`  SKIP  ${u.id} — no email address, so no profile can be created`);
      continue;
    }

    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const named = [meta.full_name, meta.name].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    const avatar = [meta.avatar_url, meta.picture].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    const name = named?.trim() || u.email.split("@")[0];

    if (!apply) {
      console.log(`  WOULD CREATE  ${u.email.padEnd(32)} name="${name}" role=CLIENT`);
      continue;
    }

    await prisma.user.create({
      data: { id: u.id, email: u.email, name, avatarUrl: avatar ?? null, role: "CLIENT" },
    });
    console.log(`  CREATED       ${u.email.padEnd(32)} name="${name}" role=CLIENT`);
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to create these.");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
