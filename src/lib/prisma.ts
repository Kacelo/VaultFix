import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Next.js hot-reloads server modules in development, which would build a new
 * PrismaClient (and a new pg pool) on every edit until Supabase refuses
 * connections. Cache the instance on globalThis so dev reuses a single pool;
 * production gets a fresh client per server instance.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Production cache. Dev uses globalThis so hot reloads reuse one pool. */
let client: PrismaClient | undefined;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Locally it belongs in .env at the repository " +
        "root; on a deployed environment set it as an environment variable."
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (client) return client;

  const created = createPrismaClient();

  if (process.env.NODE_ENV === "production") {
    client = created;
  } else {
    globalForPrisma.prisma = created;
  }

  return created;
}

/**
 * Constructed on first use, not on import.
 *
 * `next build` loads every server module while collecting page data, so an
 * eagerly created client made DATABASE_URL a BUILD-time requirement — the
 * build failed before a single query was ever issued, on a variable only the
 * running app needs. Deferring it means the build only needs the variables it
 * genuinely uses, and a missing DATABASE_URL surfaces where it actually
 * matters: the first request that touches the database.
 *
 * The proxy forwards everything to the real client, binding methods so `this`
 * stays correct for calls like `prisma.$transaction(...)`. Model access
 * (`prisma.user`) returns the delegate untouched.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
