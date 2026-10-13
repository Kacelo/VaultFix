import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the tsconfig path alias so a mocked module resolves to the same
    // file the action under test imports.
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
