/**
 * TRAI Ingestion Fetcher
 *
 * Fetches the TRAI release-publication portal, extracts regulation and direction
 * PDF links, downloads the PDFs, and extracts text content for database ingestion.
 *
 * Usage:
 *   npx tsx scripts/ingest-fetch.ts
 *   npx tsx scripts/ingest-fetch.ts --dry-run     # log what would be fetched
 *   npx tsx scripts/ingest-fetch.ts --force        # re-download existing files
 *   npx tsx scripts/ingest-fetch.ts --limit 5      # fetch only first N documents
 */

import * as cheerio from "cheerio";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  createWriteStream,
} from "node:fs";
import { join, basename } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.trai.gov.in";
const REGULATIONS_URL = `${BASE_URL}/release-publication/regulations`;
const DIRECTIONS_URL = `${BASE_URL}/release-publication/directions`;
const ORDERS_TELECOM_URL = `${BASE_URL}/release-publication/consolidated-tariff-orders/telecom`;
const ORDERS_BROADCASTING_URL = `${BASE_URL}/release-publication/consolidated-tariff-orders/broadcasting`;
const RAW_DIR = "data/raw";
const RATE_LIMIT_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;
const USER_AGENT = "Ansvar-MCP/1.0 (regulatory-data-ingestion; https://ansvar.eu)";

// Pagination hard cap per source (safety fuse). TRAI uses Drupal paging
// (?page=N, zero-indexed). Regulations max observed: page=11 (12 pages).
// Directions max observed: page=13 (14 pages). Orders listings are single-page.
const MAX_PAGES_PER_SOURCE = 20;

// Keywords to identify telecom regulatory documents
const TELECOM_KEYWORDS = [
  "quality of service",
  "qos",
  "consumer protection",
  "tariff",
  "interconnection",
  "number portability",
  "mnp",
  "roaming",
  "broadband",
  "unsolicited commercial",
  "ucc",
  "do not disturb",
  "dnd",
  "spectrum",
  "net neutrality",
  "ott",
  "telecom",
  "mobile",
  "internet service",
  "call drop",
  "5g",
  "subscriber",
  "mvno",
  "satellite",
];

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const fetchLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? "999", 10) : 999;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentLink {
  title: string;
  url: string;
  category: string;
  filename: string;
}

interface FetchedDocument {
  title: string;
  url: string;
  category: string;
  filename: string;
  text: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.error(
        `  Attempt ${attempt + 1}/${retries} failed for ${url}: ${lastError.message}. ` +
          `Retrying in ${backoff}ms...`,
      );
      if (attempt < retries - 1) await sleep(backoff);
    }
  }
  throw lastError ?? new Error(`All retries failed for ${url}`);
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(pdfBuffer);
    return data.text ?? "";
  } catch (err) {
    console.error(
      `  Warning: PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

// ---------------------------------------------------------------------------
// TRAI portal scraping
// ---------------------------------------------------------------------------

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return TELECOM_KEYWORDS.some((kw) => lower.includes(kw));
}

async function scrapePortalPage(url: string, category: string): Promise<DocumentLink[]> {
  console.log(`  Fetching TRAI portal page: ${url}`);
  const response = await fetchWithRetry(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const links: DocumentLink[] = [];

  // TRAI release-publication pages use Drupal views:
  //   .view-content ul.item-list > li
  //     .title-number .field-content    -> full regulation/direction/order title
  //     .release-date .field-content    -> date (dd/mm/yyyy)
  //     .division-section .field-content -> topic (e.g. "Financial & Economic Analysis")
  //     .download-field a[href]          -> PDF link(s) (may be multiple for amendments)
  //
  // We emit one DocumentLink per PDF <a>, tagged with the parent <li>'s title.
  $(".view-content ul.item-list > li").each((_, li) => {
    const liEl = $(li);
    const title = liEl.find(".title-number .field-content").first().text().trim();
    const releaseDate = liEl.find(".release-date .field-content").first().text().trim();
    const section = liEl.find(".division-section .field-content").first().text().trim();
    if (!title) return;

    liEl.find('a[href*="/sites/default/files/"], a[href$=".pdf"]').each((_, a) => {
      const href = $(a).attr("href") ?? "";
      if (!href) return;
      const ariaLabel = $(a).attr("aria-label") ?? "";
      // Amendment label is the span text ("First Amendment", "72nd Amendment", "Notification", etc.)
      const labelSpan = $(a).parent().find("span").first().text().trim();

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      const filename =
        basename(href.split("?")[0] ?? href) || `trai-doc-${links.length + 1}.pdf`;
      if (links.some((l) => l.url === fullUrl)) return;

      // Compose a descriptive title: "<title> — <amendment-label>"
      let composed = title;
      if (labelSpan && !title.toLowerCase().includes(labelSpan.toLowerCase())) {
        composed = `${title} — ${labelSpan}`;
      }
      if (releaseDate) composed += ` (${releaseDate})`;
      if (section) composed += ` [${section}]`;

      // Prefer aria-label when it is substantially different (sometimes more descriptive)
      const finalTitle = ariaLabel.length > composed.length + 20 ? ariaLabel : composed;

      links.push({ title: finalTitle, url: fullUrl, category, filename });
    });
  });

  // Fallback for pages without the standard Drupal views structure: scan anchors directly.
  if (links.length === 0) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const title = $(el).text().trim();
      if (!href || !title || title.length < 10) return;
      if (!href.toLowerCase().endsWith(".pdf") && !href.includes("/sites/default/files/")) return;
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      const filename = basename(href.split("?")[0] ?? href) || `trai-doc-${links.length + 1}.pdf`;
      if (links.some((l) => l.url === fullUrl)) return;
      links.push({ title, url: fullUrl, category, filename });
    });
  }

  return links;
}

/**
 * Scrape all pages of a single TRAI listing portal using Drupal `?page=N`
 * pagination. TRAI pages are 0-indexed (page=0 is the first page, which is
 * also what the listing URL without `?page` returns).
 *
 * Stops when a page returns zero new DocumentLinks (either no `title-number`
 * items on the page, or every extracted PDF URL has already been seen on a
 * prior page) or when MAX_PAGES_PER_SOURCE is reached.
 *
 * Rate limit is honoured between every page fetch to respect the Indian
 * government portal.
 */
async function scrapePortalAllPages(
  baseUrl: string,
  category: string,
  seenUrls: Set<string>,
): Promise<{ links: DocumentLink[]; pagesFetched: number }> {
  const collected: DocumentLink[] = [];
  let pagesFetched = 0;
  let consecutiveFailures = 0;
  // Tolerate up to 2 consecutive transient failures mid-pagination. Three in
  // a row terminates the source (treated as end-of-range or genuine outage).
  const MAX_CONSECUTIVE_FAILURES = 2;

  for (let page = 0; page < MAX_PAGES_PER_SOURCE; page++) {
    const pageUrl = page === 0 ? baseUrl : `${baseUrl}?page=${page}`;

    let pageLinks: DocumentLink[] = [];
    let pageFailed = false;
    try {
      pageLinks = await scrapePortalPage(pageUrl, category);
    } catch (err) {
      pageFailed = true;
      consecutiveFailures++;
      console.error(
        `  Error scraping ${pageUrl}: ${err instanceof Error ? err.message : String(err)} ` +
          `(consecutive failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES + 1})`,
      );
      if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `  Aborting pagination for ${category} after ${consecutiveFailures} consecutive failures.`,
        );
        break;
      }
      // Backoff before trying the next page.
      await sleep(RATE_LIMIT_MS * 2);
      continue;
    }

    pagesFetched++;
    consecutiveFailures = 0;

    // Filter down to URLs we haven't already seen (cross-source dedupe).
    const freshLinks = pageLinks.filter((l) => !seenUrls.has(l.url));
    for (const l of freshLinks) seenUrls.add(l.url);

    console.log(
      `  Fetched page ${page + 1}/${MAX_PAGES_PER_SOURCE} (${category}): ${pageLinks.length} links on page, ${freshLinks.length} new`,
    );
    collected.push(...freshLinks);

    // Stop when the page has no items OR no new items (exhausted the listing).
    if (!pageFailed && (pageLinks.length === 0 || freshLinks.length === 0)) {
      break;
    }

    // Rate limit between pages.
    await sleep(RATE_LIMIT_MS);
  }

  return { links: collected, pagesFetched };
}

async function scrapeAllPortals(): Promise<{
  links: DocumentLink[];
  pagesBySource: Record<string, number>;
}> {
  const all: DocumentLink[] = [];
  const seenUrls = new Set<string>();
  const pagesBySource: Record<string, number> = {};

  const sources: Array<{ url: string; category: string; key: string }> = [
    { url: REGULATIONS_URL, category: "Regulations", key: "regulations" },
    { url: DIRECTIONS_URL, category: "Directions", key: "directions" },
    { url: ORDERS_TELECOM_URL, category: "Orders", key: "orders_telecom" },
    { url: ORDERS_BROADCASTING_URL, category: "Orders", key: "orders_broadcasting" },
  ];

  for (const source of sources) {
    console.log(`\n=== Scraping ${source.category} (${source.url}) ===`);
    const { links, pagesFetched } = await scrapePortalAllPages(
      source.url,
      source.category,
      seenUrls,
    );
    pagesBySource[source.key] = pagesFetched;
    console.log(
      `  Total new documents in ${source.category}: ${links.length} (across ${pagesFetched} page(s))`,
    );
    all.push(...links);
    // Rate limit between sources.
    await sleep(RATE_LIMIT_MS);
  }

  // If scraping yielded nothing, fall back to known documents
  if (all.length === 0) {
    console.warn("  Warning: No links found via scraping. Portal may require JavaScript.");
    console.warn("  Falling back to known document list.");
    return { links: getKnownDocuments(), pagesBySource };
  }

  return { links: all, pagesBySource };
}

function getKnownDocuments(): DocumentLink[] {
  return [
    {
      title: "Quality of Service (Code of Practice for Metering and Billing Accuracy) Regulations 2006",
      url: "https://www.trai.gov.in/sites/default/files/QoSregulation.pdf",
      category: "Regulations",
      filename: "QoSregulation.pdf",
    },
    {
      title: "Quality of Service (Broadband) Regulations 2021",
      url: "https://www.trai.gov.in/sites/default/files/BroadbandQoS2021.pdf",
      category: "Regulations",
      filename: "BroadbandQoS2021.pdf",
    },
    {
      title: "Telecom Commercial Communications Customer Preference Regulations 2018",
      url: "https://www.trai.gov.in/sites/default/files/TCCCPR_2018.pdf",
      category: "Regulations",
      filename: "TCCCPR_2018.pdf",
    },
    {
      title: "Telecom Consumers Protection and Redressal of Grievances Regulations 2012",
      url: "https://www.trai.gov.in/sites/default/files/ConsumerProtection_2012.pdf",
      category: "Regulations",
      filename: "ConsumerProtection_2012.pdf",
    },
    {
      title: "Interconnection Regulations 2018",
      url: "https://www.trai.gov.in/sites/default/files/Interconnection_Regulations_2018.pdf",
      category: "Regulations",
      filename: "Interconnection_Regulations_2018.pdf",
    },
    {
      title: "Mobile Number Portability Regulations 2009",
      url: "https://www.trai.gov.in/sites/default/files/MNP_Regulations_2009.pdf",
      category: "Regulations",
      filename: "MNP_Regulations_2009.pdf",
    },
    {
      title: "Prohibition of Discriminatory Tariffs for Data Services Regulations 2016",
      url: "https://www.trai.gov.in/sites/default/files/Regulation_Data_Service2016.pdf",
      category: "Regulations",
      filename: "Regulation_Data_Service2016.pdf",
    },
    {
      title: "Interconnect Usage Charges Order 2017",
      url: "https://www.trai.gov.in/sites/default/files/IUC_Order_2017.pdf",
      category: "Orders",
      filename: "IUC_Order_2017.pdf",
    },
    {
      title: "Mobile Number Portability Processing Time Order 2018",
      url: "https://www.trai.gov.in/sites/default/files/MNP_Order_2018.pdf",
      category: "Orders",
      filename: "MNP_Order_2018.pdf",
    },
    {
      title: "Mandatory Disclosure of Broadband Speeds Order 2021",
      url: "https://www.trai.gov.in/sites/default/files/BroadbandSpeed_Order_2021.pdf",
      category: "Orders",
      filename: "BroadbandSpeed_Order_2021.pdf",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created directory: ${RAW_DIR}`);
  }

  const scrape = await scrapeAllPortals();
  let documents = scrape.links;
  console.log(`\nFound ${documents.length} TRAI documents across all paginated sources`);
  console.log(`  Pages fetched: ${JSON.stringify(scrape.pagesBySource)}`);

  if (documents.length > fetchLimit) {
    documents = documents.slice(0, fetchLimit);
    console.log(`Limiting to ${fetchLimit} documents`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would fetch:");
    for (const doc of documents) {
      console.log(`  ${doc.title} → ${doc.filename}`);
    }
    return;
  }

  const fetched: FetchedDocument[] = [];
  let skipped = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    const destPath = join(RAW_DIR, doc.filename);
    const metaPath = join(RAW_DIR, `${doc.filename}.meta.json`);

    if (!force && existsSync(metaPath)) {
      console.log(`[${i + 1}/${documents.length}] Skipping (exists): ${doc.title}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${documents.length}] Fetching: ${doc.title}`);
    console.log(`  URL: ${doc.url}`);

    try {
      const response = await fetchWithRetry(doc.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      writeFileSync(destPath, buffer);
      console.log(`  Downloaded: ${buffer.length.toLocaleString()} bytes → ${destPath}`);

      const text = await extractPdfText(buffer);
      console.log(`  Extracted text: ${text.length.toLocaleString()} chars`);

      const meta: FetchedDocument = {
        title: doc.title,
        url: doc.url,
        category: doc.category,
        filename: doc.filename,
        text,
        fetchedAt: new Date().toISOString(),
      };

      writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
      fetched.push(meta);
    } catch (err) {
      console.error(
        `  ERROR fetching ${doc.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Rate limit between requests
    if (i < documents.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    total: documents.length,
    fetched: fetched.length,
    skipped,
    errors: documents.length - fetched.length - skipped,
    pagesBySource: scrape.pagesBySource,
    documents: fetched.map((d) => ({
      title: d.title,
      filename: d.filename,
      category: d.category,
      textLength: d.text.length,
    })),
  };

  writeFileSync(join(RAW_DIR, "fetch-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\nFetch complete: ${fetched.length} fetched, ${skipped} skipped, ${summary.errors} errors`);
  console.log(`Summary written to ${join(RAW_DIR, "fetch-summary.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
