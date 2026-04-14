#!/usr/bin/env node

/**
 * India TRAI Telecom Regulation MCP — stdio entry point.
 *
 * Provides MCP tools for querying Telecom Regulatory Authority of India (TRAI)
 * regulations, directions, orders, quality of service regulations, consumer
 * protection rules, and unsolicited commercial communications regulations.
 *
 * Tool prefix: in_trai_
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  searchRegulations,
  searchControls,
  getControl,
  getCircular,
  listFrameworks,
  getStats,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback
}

let sourcesYml = "";
try {
  sourcesYml = readFileSync(join(__dirname, "..", "sources.yml"), "utf8");
} catch {
  // fallback
}

const SERVER_NAME = "india-trai-regulation-mcp";

const DISCLAIMER =
  "This data is provided for informational reference only. It does not constitute legal or professional advice. " +
  "Always verify against official TRAI publications at https://www.trai.gov.in/. " +
  "TRAI regulations are subject to change; confirm currency before reliance.";

const SOURCE_URL = "https://www.trai.gov.in/release-publication/regulations";

// --- Tool definitions ---------------------------------------------------------

const TOOLS = [
  {
    name: "in_trai_search_regulations",
    description:
      "Full-text search across TRAI telecom regulations, directions, and orders. " +
      "Covers TRAI Regulations, Quality of Service Regulations, Consumer Protection Regulations, " +
      "Unsolicited Commercial Communications (UCC) Regulations, Tariff Orders, and Directions " +
      "for telecom service providers operating in India. " +
      "Returns matching regulations and directions with reference, title, category, and summary.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'quality of service', 'consumer protection', 'unsolicited commercial communications', 'broadband')",
        },
        domain: {
          type: "string",
          description:
            "Filter by domain or category (e.g., 'Regulations', 'Directions', 'Quality of Service', " +
            "'Consumer Protection', 'Tariff Orders'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "in_trai_get_regulation",
    description:
      "Get a specific TRAI regulation or direction by its reference identifier. " +
      "For regulations use the regulation reference (e.g., 'TRAI-REG-2016-001'). " +
      "For directions use the direction reference number (e.g., 'TRAI-DIR-2021-QOS-001').",
    inputSchema: {
      type: "object" as const,
      properties: {
        document_id: {
          type: "string",
          description: "Regulation reference or direction reference number",
        },
      },
      required: ["document_id"],
    },
  },
  {
    name: "in_trai_search_directions",
    description:
      "Search TRAI directions specifically. Covers all directions issued to telecom service providers " +
      "across categories: Quality of Service, Consumer Protection, Interconnection, Numbering, " +
      "Roaming, Broadband, and Unsolicited Commercial Communications. " +
      "Returns directions with their category and compliance requirements.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'call drop', 'broadband speed', 'do not disturb', 'interconnection')",
        },
        framework: {
          type: "string",
          enum: ["trai-regulations", "trai-directions", "trai-orders"],
          description:
            "Filter by document type. trai-regulations=Regulations, " +
            "trai-directions=Directions to operators, trai-orders=Tariff/other Orders. Optional.",
        },
        domain: {
          type: "string",
          description:
            "Filter by domain (e.g., 'Quality of Service', 'Consumer Protection', 'Interconnection'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "in_trai_list_categories",
    description:
      "List all TRAI regulation categories covered by this server, including version, " +
      "effective date, and item counts. " +
      "Use this to understand what regulatory material is available before searching.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "in_trai_about",
    description:
      "Return metadata about this MCP server: version, data sources, coverage summary, " +
      "and list of available tools.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "in_trai_list_sources",
    description:
      "Return data provenance information: which TRAI sources are indexed, " +
      "how data is retrieved, update frequency, and licensing terms.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// --- Zod schemas --------------------------------------------------------------

const SearchRegulationsArgs = z.object({
  query: z.string().min(1),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const GetRegulationArgs = z.object({
  document_id: z.string().min(1),
});

const SearchDirectionsArgs = z.object({
  query: z.string().min(1),
  framework: z.enum(["trai-regulations", "trai-directions", "trai-orders"]).optional(),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

// --- Helpers ------------------------------------------------------------------

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function buildMeta(sourceUrl?: string): Record<string, unknown> {
  return {
    disclaimer: DISCLAIMER,
    data_age: "See coverage.json; refresh frequency: monthly",
    source_url: sourceUrl ?? SOURCE_URL,
  };
}

// --- Server -------------------------------------------------------------------

const server = new Server(
  { name: SERVER_NAME, version: pkgVersion },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "in_trai_search_regulations": {
        const parsed = SearchRegulationsArgs.parse(args);
        const results = searchRegulations({
          query: parsed.query,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "in_trai_get_regulation": {
        const parsed = GetRegulationArgs.parse(args);
        const docId = parsed.document_id;

        // Try regulation (control) first
        const control = getControl(docId);
        if (control) {
          return textContent({
            ...control,
            _citation: {
              canonical_ref: control.control_ref,
              display_text: `TRAI — ${control.title} (${control.control_ref})`,
            },
            _meta: buildMeta(),
          });
        }

        // Try direction (circular)
        const circular = getCircular(docId);
        if (circular) {
          return textContent({
            ...circular,
            _citation: {
              canonical_ref: circular.reference,
              display_text: `TRAI Direction — ${circular.title} (${circular.reference})`,
            },
            _meta: buildMeta(circular.pdf_url ?? SOURCE_URL),
          });
        }

        return errorContent(
          `No regulation or direction found with reference: ${docId}. ` +
            "Use in_trai_search_regulations to find available references.",
        );
      }

      case "in_trai_search_directions": {
        const parsed = SearchDirectionsArgs.parse(args);
        const results = searchControls({
          query: parsed.query,
          framework: parsed.framework,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "in_trai_list_categories": {
        const frameworks = listFrameworks();
        return textContent({
          categories: frameworks,
          count: frameworks.length,
          _meta: buildMeta(),
        });
      }

      case "in_trai_about": {
        const stats = getStats();
        return textContent({
          name: SERVER_NAME,
          version: pkgVersion,
          description:
            "Telecom Regulatory Authority of India (TRAI) MCP server. " +
            "Provides structured access to TRAI regulations, directions, orders, " +
            "and consumer protection rules for telecom service providers operating in India.",
          data_source: "Telecom Regulatory Authority of India (TRAI)",
          source_url: SOURCE_URL,
          coverage: {
            categories: `${stats.frameworks} TRAI regulation categories`,
            regulations: `${stats.controls} regulations and directions`,
            orders: `${stats.circulars} tariff orders and notices`,
            jurisdictions: ["India"],
            sectors: ["Telecom", "Broadband", "ISP", "Satellite"],
          },
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          _meta: buildMeta(),
        });
      }

      case "in_trai_list_sources": {
        return textContent({
          sources_yml: sourcesYml,
          note: "Data is sourced from official TRAI public publications. See sources.yml for full provenance.",
          _meta: buildMeta(),
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorContent(
      `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
});

// --- Start --------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} v${pkgVersion} running on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(
    `Fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
