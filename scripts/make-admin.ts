/**
 * Promotes an existing account to ADMIN.
 *
 * Granting ADMIN is deliberately impossible through the application: the only
 * function that writes `role` is `syncUserProfile`, which rejects anything but
 * CLIENT or ELECTRICIAN at runtime precisely so that a public endpoint cannot
 * mint administrators. The first admin therefore has to be created out of band,
 * by someone holding direct database credentials — which is the point.
 *
 * Do not add an in-app route that does this.
 *
 *   pnpm make-admin someone@example.com
 *   pnpm make-admin someone@example.com --demote
 *
 * The role is read from the `users` table on every request, so the change takes
 * effect immediately — no sign-out required.
 *
 * Requires the generated Prisma client, which is a build artifact and not in
 * git. From a fresh clone, run `prisma generate` (or build the frontend once)
 * before this.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2]?.trim().toLowerCase();
const demote = process.argv.includes("--demote");

if (!email || email.startsWith("--")) {
  console.error("Usage: pnpm make-admin <email> [--demote]");
  process.exit(1);
}

// The session pooler, not the transaction pooler: this is a one-off
// administrative write, not serverless request traffic.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "Neither DIRECT_URL nor DATABASE_URL is set — expected it in .env at the\n" +
      "repository root."
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.error(
      `No account found for ${email}.\n` +
        "Sign up through the app first — this promotes an existing user, it " +
        "does not create one."
    );
    process.exit(1);
  }

  const target = demote ? "CLIENT" : "ADMIN";

  console.log(`Found: ${user.name} <${user.email}>`);
  console.log(`Role:  ${user.role} -> ${target}`);

  if (user.role === target) {
    console.log("Already set. Nothing to do.");
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: target } });
  console.log(`Done. ${user.email} is now ${target}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
