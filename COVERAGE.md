# Coverage — India TRAI Telecom Regulation MCP

> Last verified: 2026-04-14 | Database version: 0.1.0

## What's Included

| Source | Items (frameworks + circulars) | Version | Completeness | Refresh |
|--------|------|---------|-------------|---------|
| [TRAI Regulations](https://www.trai.gov.in/release-publication/regulations) | 27 (6 + 21) | Current (up to 24/03/2026) | First-page listing | Monthly |
| [TRAI Directions](https://www.trai.gov.in/release-publication/directions) | 32 (9 + 23) | Current (up to 27/03/2026) | First-page listing | Monthly |
| [TRAI Tariff Orders — Telecom](https://www.trai.gov.in/release-publication/consolidated-tariff-orders/telecom) + [Broadcasting](https://www.trai.gov.in/release-publication/consolidated-tariff-orders/broadcasting) | 6 (2 + 4) | Current | First-page listing | Monthly |

**Total:** 65 real TRAI documents (17 frameworks, 48 circulars, 17 auto-generated framework-scope controls). 6 tools exposed.

> Note: TRAI's `release-publication/orders` path returns 404. "Orders" are published separately as
> **Consolidated Tariff Orders** for Telecom and Broadcasting. Both sub-portals are ingested and
> tagged with `category = "Orders"` in the database.

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
| Paginated back-catalog (pre-2022 regulations/directions) | Scraper only reads page 1 of each portal | v0.2 (add pagination follow) |
| Hindi bilingual provisions | English extraction via `pdf-parse` | Yes v2 |
| Scanned/image-only PDFs | `pdf-parse` extracts 0 chars on scanned orders (e.g. `CA_01042015.pdf`) | v0.3 (add OCR fallback) |
| XLSX annexures | Stored with empty text; titles and URLs preserved | v0.3 |
| TDSAT decisions | Separate publisher, out of scope | No |
| DOT licence conditions | DOT is a separate authority | No |
| Spectrum allocation decisions | WPC/DOT domain | No |
| CCI competition decisions | CCI is separate authority | No |
| Individual penalty orders | Not consistently published under the three primary portals | No |

## Limitations

- TRAI publications are PDF-based; text extraction may miss formatting, tables, and footnotes
- A handful of source documents (old orders, XLSX annexures) have empty extracted text; title/URL are still searchable
- Listing pages are rendered server-side but only show the first page of results — older items require follow-up pagination work
- TRAI portal structure is dynamic; HTML scraping may require maintenance if Drupal views layout changes

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| TRAI Regulations | Monthly | 2026-04-14 | 2026-05-14 |
| TRAI Directions | Monthly | 2026-04-14 | 2026-05-14 |
| TRAI Tariff Orders (Telecom + Broadcasting) | Monthly | 2026-04-14 | 2026-05-14 |

To check freshness programmatically, call the `in_trai_about` tool.
