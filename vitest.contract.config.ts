/**
 * Contract test configuration.
 *
 * Contract tests verify the MCP server responds correctly to tool calls
 * matching the fleet manifest contract_tests definitions.
 *
 * Run after seeding / building the database:
 *   npm run seed          # or: npm run build:db
 *   npm run test:contract
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.contract.test.ts"],
    exclude: ["node_modules", "dist"],
    reporters: ["verbose"],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
