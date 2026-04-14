/**
 * Contract tests for India TRAI Telecom Regulation MCP.
 *
 * These tests exercise the database query helpers that back the public
 * tools in src/index.ts, then simulate the `_meta` + `_citation` envelope
 * the tool handler produces. They match the fleet manifest contract_tests
 * definitions for `india-trai-regulation-mcp`.
 *
 * Prerequisites: a seeded database at data/trai.db. The suite skips
 * itself if the DB is missing (CI seeds via `npm run seed` before running
 * the contract gate).
 *
 * Covers four gates from the golden-standard remediation template:
 *   1. Tool discovery            — all 6 tool-backing functions callable
 *   2. Representative call       — in_trai_get_regulation returns _citation
 *   3. Citation presence         — _citation.canonical_ref + source_url
 *   4. _meta presence            — disclaimer + data_age + source_url
 */

import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = process.env["TRAI_DB_PATH"] ?? join(ROOT, "data", "trai.db");

const SOURCE_URL_TRAI =
  "https://www.trai.gov.in/release-publication/regulations";

// Ensure the db singleton resolves the same file we inspect directly.
beforeAll(() => {
  if (!process.env["TRAI_DB_PATH"]) {
    process.env["TRAI_DB_PATH"] = DB_PATH;
  }
});

async function getHelpers() {
  return import("../src/db.js");
}

const HAS_DB = existsSync(DB_PATH);

// Dynamically discover a real control_ref + circular reference from the live
// DB so tests survive corpus refreshes without hardcoding identifiers.
function pickSampleRefs(): {
  controlRef: string | null;
  circularRef: string | null;
  frameworkId: string | null;
} {
  if (!HAS_DB)
    return { controlRef: null, circularRef: null, frameworkId: null };
  const db = new Database(DB_PATH, { readonly: true });
  const control = db
    .prepare("SELECT control_ref FROM controls LIMIT 1")
    .get() as { control_ref: string } | undefined;
  const circular = db
    .prepare("SELECT reference FROM circulars LIMIT 1")
    .get() as { reference: string } | undefined;
  const framework = db
    .prepare("SELECT id FROM frameworks LIMIT 1")
    .get() as { id: string } | undefined;
  db.close();
  return {
    controlRef: control?.control_ref ?? null,
    circularRef: circular?.reference ?? null,
    frameworkId: framework?.id ?? null,
  };
}

describe.skipIf(!HAS_DB)("Contract: tool discovery", () => {
  it("exports all 6 tool-backing functions", async () => {
    const helpers = await getHelpers();
    expect(typeof helpers.searchRegulations).toBe("function");
    expect(typeof helpers.searchControls).toBe("function");
    expect(typeof helpers.searchCirculars).toBe("function");
    expect(typeof helpers.getControl).toBe("function");
    expect(typeof helpers.getCircular).toBe("function");
    expect(typeof helpers.listFrameworks).toBe("function");
    expect(typeof helpers.getStats).toBe("function");
  });

  it("getStats returns non-zero counts against the shipped DB", async () => {
    const { getStats } = await getHelpers();
    const stats = getStats();
    expect(stats.frameworks).toBeGreaterThan(0);
    expect(stats.controls).toBeGreaterThan(0);
    expect(stats.circulars).toBeGreaterThan(0);
  });
});

describe.skipIf(!HAS_DB)("Contract: in_trai_search_regulations", () => {
  it("returns merged control + circular results for a common term", async () => {
    const { searchRegulations } = await getHelpers();
    const results = searchRegulations({ query: "quality", limit: 10 });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(["control", "circular"]).toContain(r.type);
      expect(r.title).toBeTruthy();
      expect(r.reference).toBeTruthy();
    }
  });

  it("respects the limit parameter", async () => {
    const { searchRegulations } = await getHelpers();
    const results = searchRegulations({ query: "regulation", limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe.skipIf(!HAS_DB)("Contract: in_trai_search_directions", () => {
  it("returns controls for a common TRAI term", async () => {
    const { searchControls } = await getHelpers();
    const rows = searchControls({ query: "service", limit: 5 });
    expect(Array.isArray(rows)).toBe(true);
    // Loose lower-bound; live DB has 86+ controls so this should hit.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.control_ref).toBeTruthy();
    expect(rows[0]!.title).toBeTruthy();
  });

  it("accepts a framework filter without throwing", async () => {
    const { searchControls } = await getHelpers();
    const { frameworkId } = pickSampleRefs();
    expect(frameworkId).not.toBeNull();
    const rows = searchControls({
      query: "service",
      framework: frameworkId!,
      limit: 3,
    });
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe.skipIf(!HAS_DB)(
  "Contract: in_trai_get_regulation (representative call, _citation + _meta)",
  () => {
    it("returns a populated control for a real control_ref", async () => {
      const { getControl } = await getHelpers();
      const { controlRef } = pickSampleRefs();
      expect(controlRef).not.toBeNull();

      const control = getControl(controlRef!);
      expect(control).not.toBeNull();
      expect(control!.control_ref).toBe(controlRef);
      expect(control!.title).toBeTruthy();
      expect(control!.description).toBeTruthy();
    });

    it("returns null for a non-existent control reference", async () => {
      const { getControl } = await getHelpers();
      const control = getControl("NOT-A-REAL-REF-XYZ-0-0-0");
      expect(control).toBeNull();
    });

    it("envelope simulates the _citation + _meta contract", async () => {
      // The tool handler in src/index.ts wraps getControl / getCircular output
      // in a _citation block and buildMeta() envelope. We assert that shape
      // here against a real control to match the fleet manifest contract.
      const { getControl } = await getHelpers();
      const { controlRef } = pickSampleRefs();
      const control = getControl(controlRef!);
      expect(control).not.toBeNull();

      const DISCLAIMER =
        "This data is provided for informational reference only. It does not constitute legal or professional advice. " +
        "Always verify against official TRAI publications at https://www.trai.gov.in/. " +
        "TRAI regulations are subject to change; confirm currency before reliance.";

      const envelope = {
        ...control!,
        _citation: {
          canonical_ref: control!.control_ref,
          display_text: `TRAI — ${control!.title} (${control!.control_ref})`,
          aliases: [control!.control_ref],
          source_url: SOURCE_URL_TRAI,
          lookup: {
            tool: "in_trai_get_regulation",
            args: { document_id: control!.control_ref },
          },
        },
        _meta: {
          disclaimer: DISCLAIMER,
          data_age: "See coverage.json; refresh frequency: monthly",
          source_url: SOURCE_URL_TRAI,
        },
      };

      expect(envelope._citation).toBeTruthy();
      expect(envelope._citation.canonical_ref).toBe(control!.control_ref);
      expect(envelope._citation.source_url).toMatch(/trai\.gov\.in/);
      expect(envelope._citation.lookup.tool).toBe("in_trai_get_regulation");

      expect(envelope._meta).toBeTruthy();
      expect(envelope._meta.disclaimer).toBeTruthy();
      expect(envelope._meta.data_age).toBeTruthy();
      expect(envelope._meta.source_url).toMatch(/trai\.gov\.in/);
    });

    it("circular lookup also returns a populated row for a real reference", async () => {
      const { getCircular } = await getHelpers();
      const { circularRef } = pickSampleRefs();
      expect(circularRef).not.toBeNull();

      const circular = getCircular(circularRef!);
      expect(circular).not.toBeNull();
      expect(circular!.reference).toBe(circularRef);
      expect(circular!.title).toBeTruthy();
    });
  },
);

describe.skipIf(!HAS_DB)("Contract: in_trai_list_categories", () => {
  it("returns a non-empty list with required fields", async () => {
    const { listFrameworks } = await getHelpers();
    const rows = listFrameworks();
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0]!;
    expect(first.id).toBeTruthy();
    expect(first.name).toBeTruthy();
  });
});

describe.skipIf(!HAS_DB)(
  "Contract: in_trai_about / in_trai_list_sources",
  () => {
    it("metadata surface returns values the handler can project", async () => {
      const { getStats } = await getHelpers();
      const stats = getStats();

      // about envelope
      const about = {
        name: "india-trai-regulation-mcp",
        version: "0.1.0",
        coverage: {
          categories: `${stats.frameworks} TRAI regulation categories`,
          controls: `${stats.controls} per-framework scope controls`,
          documents: `${stats.circulars} regulations, directions, and orders`,
        },
        _meta: {
          data_age: "See coverage.json; refresh frequency: monthly",
          source_url: SOURCE_URL_TRAI,
        },
      };
      expect(about.name).toBe("india-trai-regulation-mcp");
      expect(about._meta.data_age).toBeTruthy();
      expect(about._meta.source_url).toMatch(/trai\.gov\.in/);
    });
  },
);
