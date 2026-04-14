/**
 * Smoke test placeholder — ensures `npm test` exits 0 while the real
 * test suite (query shape, tool contract, pagination resilience) is
 * still pending.
 *
 * When a proper suite lands, delete this file.
 */
import { describe, it, expect } from "vitest";

describe("india-trai-regulation-mcp smoke", () => {
  it("package metadata is present", async () => {
    const pkg = (await import("../package.json")).default as {
      name: string;
      version: string;
    };
    expect(pkg.name).toBe("@ansvar/india-trai-regulation-mcp");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
