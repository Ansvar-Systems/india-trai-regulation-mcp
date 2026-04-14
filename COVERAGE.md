# Coverage — India TRAI Telecom Regulation MCP

> Last verified: 2026-04-14 | Database version: 0.1.0

## What's Included

| Source | Items (frameworks + circulars) | Version | Completeness | Refresh |
|--------|------|---------|-------------|---------|
| [TRAI Regulations](https://www.trai.gov.in/release-publication/regulations) | 303 (28 + 275) | Current (up to 24/03/2026) | Full archive (pages 0–13, 14 pages paginated) | Monthly |
| [TRAI Directions](https://www.trai.gov.in/release-publication/directions) | 398 (56 + 342) | Current (up to 27/03/2026) | Full archive (pages 0–14, 15 pages paginated) | Monthly |
| [TRAI Tariff Orders — Telecom](https://www.trai.gov.in/release-publication/consolidated-tariff-orders/telecom) + [Broadcasting](https://www.trai.gov.in/release-publication/consolidated-tariff-orders/broadcasting) | 6 (2 + 4) | Current | Single-page consolidated listings | Monthly |

**Total:** 707 real TRAI documents (86 frameworks, 621 circulars, 86 auto-generated framework-scope controls). 6 tools exposed.

> Note: TRAI's `release-publication/orders` path returns 404. "Orders" are published separately as
> **Consolidated Tariff Orders** for Telecom and Broadcasting. Both sub-portals are ingested and
> tagged with `category = "Orders"` in the database.

### Pagination

As of v0.2 the ingester walks every paginated Drupal view (`?page=N`) per
source with a 5s polite delay between page fetches, dedupes PDF URLs across
all sources, and stops when a page yields zero new items (or after a hard
cap of 20 pages per source). See `scripts/ingest-fetch.ts` — `MAX_PAGES_PER_SOURCE`
and `scrapePortalAllPages`. Transient page fetch failures tolerate up to 2
consecutive retries before terminating the source, preserving partial
results when the portal intermittently stalls.

## Regulation Domains Covered

| Domain | Examples |
|--------|----------|
| Quality of Service | Metering and billing accuracy, wireline/wireless broadband QoS standards, 1600-series mandatory adoption |
| Consumer Protection | Grievance redressal, TEPF fund rules, registration of consumer organisations |
| Unsolicited Commercial Communications (UCC) | TCCCPR amendments, DLT headers/templates, CRF digital consent pilot, 1909 reporting |
| Interconnection | Broadcasting & Cable (Addressable Systems) Interconnection amendments (4th–7th) |
| Number Portability | Mobile Number Portability 9th Amendment |
| Tariff | Telecommunication Tariff Orders 67th–72nd amendments |
| Broadcasting | Addressable Systems tariff, QoS, rating of properties for digital connectivity |
| Miscellaneous | TRAI officer/staff appointment regulations, repealing regulations |

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| Hindi bilingual provisions | English extraction via `pdf-parse` | Yes v2 |
| Scanned/image-only PDFs | `pdf-parse` extracts 0 chars on scanned orders (e.g. `CA_01042015.pdf`) | v0.3 (add OCR fallback) |
| XLSX annexures | Stored with empty text; titles and URLs preserved | v0.3 |
| TDSAT decisions | Separate publisher, out of scope | No |
| DOT licence conditions | DOT is a separate authority | No |
| Spectrum allocation decisions | WPC/DOT domain | No |
| CCI competition decisions | CCI is separate authority | No |
| Individual penalty orders | Not consistently published under the three primary portals | No |
| 4 PDF URLs | 2 HTTP 404 on TRAI side (Indusind, Hathway 2019) + 2 transient network failures | Re-attempt on next monthly refresh |

## Limitations

- TRAI publications are PDF-based; text extraction may miss formatting, tables, and footnotes
- A handful of source documents (old orders, XLSX annexures) have empty extracted text; title/URL are still searchable
- TRAI portal structure is dynamic; HTML scraping may require maintenance if Drupal views layout changes
- Pagination follows Drupal `?page=N` with a 20-page safety cap per source; the current archive fits well within that cap (max observed: 15 pages on Directions)

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| TRAI Regulations | Monthly | 2026-04-14 | 2026-05-14 |
| TRAI Directions | Monthly | 2026-04-14 | 2026-05-14 |
| TRAI Tariff Orders (Telecom + Broadcasting) | Monthly | 2026-04-14 | 2026-05-14 |

To check freshness programmatically, call the `in_trai_about` tool.
