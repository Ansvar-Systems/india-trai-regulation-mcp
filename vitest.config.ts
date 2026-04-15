import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".git", "tests/**/*.contract.test.ts"],
    reporters: ["verbose"],
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    watchExclude: ["node_modules", "dist"],
  },
});
