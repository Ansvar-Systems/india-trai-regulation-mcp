/**
 * Update data/coverage.json with current database statistics.
 *
 * Reads the TRAI SQLite database and writes a coverage summary file
 * used by the freshness checker, fleet manifest, and the in_trai_about tool.
 *
 * Usage:
 *   npx tsx scripts/update-coverage.ts
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env["TRAI_DB_PATH"] ?? "data/trai.db";
const COVERAGE_FILE = "data/coverage.json";

interface CoverageFile {
  generatedAt: string;
  mcp: string;
  version: string;
  sources: CoverageSource[];
  totals: {
    frameworks: number;
    controls: number;
    circulars: number;
  };
}

interface CoverageSource {
  name: string;
  url: string;
  last_fetched: string | null;
  update_frequency: string;
  item_count: number;
  status: "current" | "stale" | "unknown";
}

async function main(): Promise<void> {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    console.error("Run: npm run seed  or  npm run build:db");
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  const frameworks = (db.prepare("SELECT COUNT(*) AS n FROM frameworks").get() as { n: number }).n;
  const controls = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as { n: number }).n;
  const circulars = (db.prepare("SELECT COUNT(*) AS n FROM circulars").get() as { n: number }).n;

  // Per-source counts for TRAI (Regulations/Directions/Orders)
  const bySource = db
    .prepare("SELECT category AS name, COUNT(*) AS n FROM circulars GROUP BY category")
    .all() as Array<{ name: string; n: number }>;

  const regCount = bySource.find((s) => s.name === "Regulations")?.n ?? 0;
  const dirCount = bySource.find((s) => s.name === "Directions")?.n ?? 0;
  const orderCount = bySource.find((s) => s.name === "Orders")?.n ?? 0;

  // last_fetched is the timestamp of THIS ingestion run, not the publication
  // date of the latest TRAI document. The freshness checker compares this
  // against `update_frequency` to detect stale ingestion (not stale upstream).
  const fetchedAt = new Date().toISOString();

  const coverage: CoverageFile = {
    generatedAt: fetchedAt,
    mcp: "india-trai-regulation-mcp",
    version: "0.1.0",
    sources: [
      {
        name: "TRAI Regulations",
        url: "https://www.trai.gov.in/release-publication/regulations",
        last_fetched: fetchedAt,
        update_frequency: "monthly",
        item_count: regCount,
        status: "current",
      },
      {
        name: "TRAI Directions",
        url: "https://www.trai.gov.in/release-publication/directions",
        last_fetched: fetchedAt,
        update_frequency: "monthly",
        item_count: dirCount,
        status: "current",
      },
      {
        // The two TRAI sub-portals (consolidated-tariff-orders/{telecom,broadcasting})
        // are merged into a single `category = "Orders"` row in the DB; we surface
        // them as one source here. See COVERAGE.md for the per-portal split.
        name: "TRAI Consolidated Tariff Orders (Telecom + Broadcasting)",
        url: "https://www.trai.gov.in/release-publication/consolidated-tariff-orders/telecom",
        last_fetched: fetchedAt,
        update_frequency: "monthly",
        item_count: orderCount,
        status: "current",
      },
    ],
    totals: { frameworks, controls, circulars },
  };

  const dir = dirname(COVERAGE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(COVERAGE_FILE, JSON.stringify(coverage, null, 2), "utf8");

  console.log(`Coverage updated: ${COVERAGE_FILE}`);
  console.log(`  Frameworks : ${frameworks}`);
  console.log(`  Controls   : ${controls}`);
  console.log(`  Circulars  : ${circulars}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
