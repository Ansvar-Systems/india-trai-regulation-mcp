/**
 * Update data/coverage.json with current database statistics.
 *
 * Reads the SAMA SQLite database and writes a coverage summary file
 * used by the freshness checker, fleet manifest, and the sa_sama_about tool.
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

  // Get last-inserted date if available
  const latestCircular = db
    .prepare("SELECT date FROM circulars ORDER BY date DESC LIMIT 1")
    .get() as { date: string } | undefined;

  // Per-source counts for TRAI (Regulations/Directions/Orders)
  const bySource = db
    .prepare("SELECT category AS name, COUNT(*) AS n FROM circulars GROUP BY category")
    .all() as Array<{ name: string; n: number }>;

  const regCount = bySource.find((s) => s.name === "Regulations")?.n ?? 0;
  const dirCount = bySource.find((s) => s.name === "Directions")?.n ?? 0;
  const orderCount = bySource.find((s) => s.name === "Orders")?.n ?? 0;

  const coverage: CoverageFile = {
    generatedAt: new Date().toISOString(),
    mcp: "india-trai-regulation-mcp",
    version: "0.1.0",
    sources: [
      {
        name: "TRAI Regulations",
        url: "https://www.trai.gov.in/release-publication/regulations",
        last_fetched: latestCircular?.date ?? null,
        update_frequency: "monthly",
        item_count: regCount,
        status: "current",
      },
      {
        name: "TRAI Directions",
        url: "https://www.trai.gov.in/release-publication/directions",
        last_fetched: latestCircular?.date ?? null,
        update_frequency: "monthly",
        item_count: dirCount,
        status: "current",
      },
      {
        name: "TRAI Tariff Orders (Telecom & Broadcasting)",
        url: "https://www.trai.gov.in/release-publication/consolidated-tariff-orders/telecom",
        last_fetched: latestCircular?.date ?? null,
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
