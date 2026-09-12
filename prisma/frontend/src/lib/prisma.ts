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
      "DATABASE_URL is not set. Copy it from prisma/.env into " +
        "prisma/frontend/.env.local — Next.js only loads env files from the app root."
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
