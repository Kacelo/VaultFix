import type { NextConfig } from "next";

/**
 * Deliberately minimal.
 *
 * This used to set `turbopack.root` to `path.resolve(__dirname)`, from when
 * the app was nested under prisma/ alongside more than one lockfile and the
 * root had to be stated explicitly.
 *
 * On Vercel that resolved to the wrong directory — `__dirname` is not reliable
 * in a compiled TypeScript config — so Turbopack rooted itself somewhere that
 * had no tsconfig.json. Next then generated a default one with no `paths`, and
 * every `@/...` import failed to type check while reporting file paths
 * relative to that phantom root (`./app/...` rather than `./src/app/...`).
 *
 * The repo is flat now with a single lockfile at the root, so Next infers the
 * root correctly. Stating it again can only reintroduce the disagreement.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
