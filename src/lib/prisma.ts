import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Next.js hot-reloads server modules in development, which would build a new
 * PrismaClient (and a new pg pool) on every edit until Supabase refuses
 * connections. Cache the instance on globalThis so dev reuses a single pool;
 * production gets a fresh client per server instance.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Locally it belongs in .env at the repository " +
        "root; on a deployed environment set it as an environment variable. " +
        "Note this is needed at BUILD time too — this client is constructed at " +
        "module load, so collecting page data fails without it."
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
