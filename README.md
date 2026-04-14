# India TRAI Telecom Regulation MCP

> Structured access to Telecom Regulatory Authority of India (TRAI) regulations, directions, and tariff/other orders — 86 framework rows and 621 indexed publications covering quality of service, consumer protection, tariff, interconnection, number portability, UCC/DLT, 5G rollout, and net neutrality.

[![npm](https://img.shields.io/npm/v/@ansvar/india-trai-regulation-mcp)](https://www.npmjs.com/package/@ansvar/india-trai-regulation-mcp)
[![License](https://img.shields.io/badge/license-BSL--1.1-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/india-trai-regulation-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/india-trai-regulation-mcp/actions/workflows/ci.yml)

Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform. This
MCP server is the authoritative Ansvar source for Indian telecom-sector
regulation, covering TRAI regulations, directions to telecom service
providers (TSPs), tariff orders, interconnection orders, consumer-protection
orders, and the Unsolicited Commercial Communication (UCC) / DLT framework.

## Quick Start

### Remote (Hetzner)

Use the hosted endpoint — no installation needed:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "india-trai-regulation": {
      "url": "https://mcp.ansvar.eu/in/trai-regulation/mcp"
    }
  }
}
```

**Cursor / VS Code** (`.cursor/mcp.json` or `.vscode/mcp.json`):
```json
{
  "servers": {
    "india-trai-regulation": {
      "url": "https://mcp.ansvar.eu/in/trai-regulation/mcp"
    }
  }
}
```

### Local (npm)

```bash
npx @ansvar/india-trai-regulation-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "india-trai-regulation": {
      "command": "npx",
      "args": ["-y", "@ansvar/india-trai-regulation-mcp"]
    }
  }
}
```

### Docker

```bash
docker pull ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
docker run -p 9195:9195 ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
```

HTTP endpoint: `http://localhost:9195/mcp`. Liveness: `http://localhost:9195/health`.

## What's Included

| Source | Version | Count | Completeness |
|--------|---------|-------|--------------|
| TRAI Regulations | current | 275 regulations | Full |
| TRAI Directions | current | 342 directions | Full |
| TRAI Consolidated Tariff & Other Orders | current | 4 consolidated orders | Full |
| Framework index rows | | 86 | Full |
| **Total rows** | | **707** (86 framework + 621 publication) | |

Framework rows by TRAI publication type:

| Domain | Frameworks |
|--------|-----------|
| Directions | 56 |
| Regulations | 28 |
| Orders | 2 |

Publications by category: Directions 342, Regulations 275, Orders 4.

Notable domains covered: Quality of Service (QoS), consumer-protection /
call-drop remedies, tariff orders, interconnection usage charges (IUC),
number portability (MNP), national roaming, broadband speed disclosure,
Unsolicited Commercial Communication (UCC) / Distributed-Ledger-based
consent framework (DLT), 5G rollout, PoI congestion, subscriber
verification, net neutrality, and broadcasting carriage tariffs.

See [COVERAGE.md](COVERAGE.md) for the full ingestion log.

## What's NOT Included

- **TRAI consultation papers and responses** — regulations, directions, and
  orders only. Consultation material is a separate track and noisy for
  compliance lookup.
- **Department of Telecommunications (DoT) licences and NIA orders** — out
  of scope; DoT is a separate authority from TRAI.
- **Spectrum-auction notices and TDSAT/court orders** — separate judicial /
  administrative tracks.
- **Hindi-only TRAI publications** — English focus for v1.
- **Broadcasting tariff orders issued before the 2017 Telecom Commercial
  Communications Customer Preference Regulations** — older orders are
  patchy on the portal.
- **TRAI Annual Reports and research studies** — informational, not
  binding; intentionally excluded.

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/india-trai-regulation-mcp
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
docker run -p 9195:9195 ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
# MCP endpoint: http://localhost:9195/mcp
# Health:       http://localhost:9195/health
```

### Hosted

- Public MCP: `https://mcp.ansvar.eu/in/trai-regulation`
- Gateway (OAuth, multi-MCP):
  [`https://gateway.ansvar.eu`](https://gateway.ansvar.eu)

## Tools

All tools use the `in_trai_` prefix. Every response includes a `_meta` object
with `disclaimer`, `data_age`, and `source_url`. Error responses also include
`_error_type` (`NO_MATCH` | `INVALID_INPUT` | `INTERNAL_ERROR`). Retrieval
tools return a `_citation` object pinned to the originating TRAI URL.

| Tool | Description |
|------|-------------|
| `in_trai_search_regulations` | Full-text search across TRAI regulations, directions, and orders (optional `type`, `domain`, `limit ≤50`) |
| `in_trai_get_regulation` | Look up a regulation, direction, or order by reference ID |
| `in_trai_search_directions` | Search TRAI directions with optional type/domain filters |
| `in_trai_list_categories` | List every TRAI regulation category with version and item counts |
| `in_trai_about` | Server metadata, coverage summary, available tools |
| `in_trai_list_sources` | Data provenance: sources, retrieval method, update frequency, licensing |

See [TOOLS.md](TOOLS.md) for parameter tables, return formats, and examples.

## Example Queries

```
# Search for Quality of Service regulations (call drop, PoI congestion, etc.)
in_trai_search_regulations("quality of service call drop", limit=10)

# Look up a specific TRAI direction by reference
in_trai_get_regulation("TRAI/DIR/2023/5G-ROLLOUT")

# Find DLT / UCC-consent directions to telecom service providers
in_trai_search_directions("DLT unsolicited commercial communication consent")

# List every regulation category with counts
in_trai_list_categories()

# Inspect data provenance (regulations / directions / orders endpoints)
in_trai_list_sources()
```

## Development

```bash
git clone https://github.com/Ansvar-Systems/india-trai-regulation-mcp.git
cd india-trai-regulation-mcp
npm install
npm run build        # compile TypeScript
npm test             # run Vitest
npm run dev          # HTTP dev server on port 9195
npm run seed         # create sample DB for offline dev
npm run build:db     # rebuild SQLite from parsed JSON
npm run ingest:full  # fetch -> build:db -> coverage update
```

Ingestion scrapes the three TRAI publication endpoints (Regulations,
Directions, Consolidated Tariff Orders), parses the PDF index entries, and
writes normalised rows into `data/trai.db`. Each publication carries its
originating URL so retrievals always cite back to `trai.gov.in`.

Branching: `feature/* → dev → main`. Direct pushes to `main` are blocked by
branch protection.

## Authority

**Telecom Regulatory Authority of India (TRAI)**
Mahanagar Doorsanchar Bhawan, Jawaharlal Nehru Marg (Old Minto Road), New
Delhi 110002, India
https://www.trai.gov.in

TRAI is established under the Telecom Regulatory Authority of India Act
1997. Its regulations, directions, and orders are binding on licensed
telecommunications service providers, broadcasting distribution platforms,
and — where applicable — consumers. Appeals lie to the Telecom Disputes
Settlement and Appellate Tribunal (TDSAT).

## License

BSL-1.1. See [LICENSE](LICENSE). Converts to Apache-2.0 on 2030-04-13.

## Disclaimer

This server provides informational reference data only. It does not
constitute legal, regulatory, or professional advice. Always verify against
the authoritative source at https://www.trai.gov.in and engage qualified
counsel for compliance decisions.

See [DISCLAIMER.md](DISCLAIMER.md) for full terms.
