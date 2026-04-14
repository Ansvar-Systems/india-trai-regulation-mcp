# India TRAI Telecom Regulation MCP

MCP server for querying Telecom Regulatory Authority of India (TRAI) regulations, directions, orders, and consumer protection rules. Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform.

## What's Included

- **TRAI Regulations** — ~80 regulations covering quality of service, consumer protection, tariff, interconnection, number portability, roaming, broadband, net neutrality, and unsolicited commercial communications
- **TRAI Directions** — ~120 directions to telecom service providers covering call drop compliance, DLT platform implementation, subscriber verification, 5G rollout, and PoI congestion management
- **TRAI Tariff & Other Orders** — ~40 orders covering interconnect usage charges, national roaming tariffs, MNP processing, and broadband speed disclosure

For full coverage details, see [COVERAGE.md](COVERAGE.md). For tool specifications, see [TOOLS.md](TOOLS.md).

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/india-trai-regulation-mcp
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
docker run -p 9195:9195 ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
```

## Usage

### stdio (Claude Desktop, Cursor, etc.)

Add to your MCP client configuration:

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

### HTTP (Streamable HTTP)

```bash
docker run -p 9195:9195 ghcr.io/ansvar-systems/india-trai-regulation-mcp:latest
# Server available at http://localhost:9195/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `in_trai_search_regulations` | Full-text search across TRAI regulations, directions, and orders |
| `in_trai_get_regulation` | Get a specific regulation or direction by reference ID |
| `in_trai_search_directions` | Search TRAI directions with optional type/domain filters |
| `in_trai_list_categories` | List all TRAI regulation categories with version and item counts |
| `in_trai_about` | Server metadata, version, and coverage summary |
| `in_trai_list_sources` | Data provenance: sources, retrieval method, licensing |

See [TOOLS.md](TOOLS.md) for parameters, return formats, and examples.

## Data Sources

All data is sourced from official TRAI public publications:

- [TRAI Regulations](https://www.trai.gov.in/release-publication/regulations)
- [TRAI Directions](https://www.trai.gov.in/release-publication/directions)
- [TRAI Orders](https://www.trai.gov.in/release-publication/orders)

See [sources.yml](sources.yml) for full provenance details.

## Development

```bash
git clone https://github.com/Ansvar-Systems/india-trai-regulation-mcp.git
cd india-trai-regulation-mcp
npm install
npm run seed        # Create sample database
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Start HTTP dev server with hot reload
```

## Disclaimer

This server provides informational reference data only. It does not constitute legal or regulatory advice. Always verify against official TRAI publications. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

## License

[BSL-1.1](LICENSE) — Ansvar Systems AB. Converts to Apache-2.0 on 2030-04-13.
