# Tools — India TRAI Telecom Regulation MCP

All tools use the `in_trai_` prefix. Every response includes a `_meta` object with `disclaimer`, `data_age`, and `source_url`.

---

## in_trai_search_regulations

Full-text search across TRAI telecom regulations, directions, and orders.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "quality of service", "call drop", "broadband speed") |
| `domain` | string | No | Filter by domain or category |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "in_trai_search_regulations",
  "arguments": {
    "query": "call drop",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "type": "control",
      "control_ref": "TRAI-REG-QOS-2016-001",
      "title": "Quality of Service (Code of Practice for Metering and Billing Accuracy) Regulations 2006 (Amendment 2016)",
      "domain": "Quality of Service",
      "summary": "TRAI QoS Regulation mandating telecom service providers to maintain defined benchmarks..."
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```

---

## in_trai_get_regulation

Get a specific TRAI regulation or direction by its reference identifier.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `document_id` | string | Yes | Regulation reference (e.g., "TRAI-REG-QOS-2016-001") or direction reference (e.g., "TRAI-DIR-2021-QOS-001") |

### Example Call

```json
{
  "name": "in_trai_get_regulation",
  "arguments": {
    "document_id": "TRAI-REG-UCC-2019"
  }
}
```

### Example Response

```json
{
  "control_ref": "TRAI-REG-UCC-2019",
  "title": "Telecom Commercial Communications Customer Preference Regulations 2018 (Amendment 2019)",
  "domain": "Consumer Protection",
  "text": "Comprehensive TRAI regulation governing unsolicited commercial communications...",
  "_citation": {
    "canonical_ref": "TRAI-REG-UCC-2019",
    "display_text": "TRAI — Telecom Commercial Communications Customer Preference Regulations 2018 (TRAI-REG-UCC-2019)"
  },
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```

Returns an error if the reference is not found, with a suggestion to use `in_trai_search_regulations`.

---

## in_trai_search_directions

Search TRAI directions specifically, with optional type and domain filters.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "DLT platform", "subscriber verification", "PoI congestion") |
| `framework` | string | No | Filter by type: `trai-regulations`, `trai-directions`, or `trai-orders` |
| `domain` | string | No | Filter by domain |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "in_trai_search_directions",
  "arguments": {
    "query": "DLT platform compliance",
    "framework": "trai-directions",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "control_ref": "TRAI-DIR-2022-DLT-001",
      "title": "Direction on DLT Platform Implementation for UCC Compliance",
      "domain": "Consumer Protection",
      "summary": "TRAI direction requiring all TSPs to implement the Distributed Ledger Technology platform...",
      "maturity_level": "Mandatory"
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```

---

## in_trai_list_categories

List all TRAI regulation categories covered by this server.

### Parameters

None.

### Example Call

```json
{
  "name": "in_trai_list_categories",
  "arguments": {}
}
```

### Example Response

```json
{
  "categories": [
    {
      "id": "trai-regulations",
      "name": "TRAI Regulations",
      "version": "Current (2024)",
      "effective_date": "1997-02-20",
      "control_count": 80,
      "domains": [
        "Quality of Service",
        "Consumer Protection",
        "Interconnection",
        "Number Portability",
        "Roaming",
        "Tariff",
        "Net Neutrality",
        "Broadband",
        "Satellite Services"
      ]
    },
    {
      "id": "trai-directions",
      "name": "TRAI Directions",
      "version": "Current (2024)",
      "effective_date": "1997-02-20",
      "control_count": 120
    },
    {
      "id": "trai-orders",
      "name": "TRAI Tariff & Other Orders",
      "version": "Current (2024)",
      "effective_date": "1997-02-20",
      "control_count": 40
    }
  ],
  "count": 3,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```

---

## in_trai_about

Return metadata about this MCP server: version, data sources, coverage summary, and available tools.

### Parameters

None.

### Example Call

```json
{
  "name": "in_trai_about",
  "arguments": {}
}
```

### Example Response

```json
{
  "name": "india-trai-regulation-mcp",
  "version": "0.1.0",
  "description": "Telecom Regulatory Authority of India (TRAI) MCP server...",
  "data_source": "Telecom Regulatory Authority of India (TRAI)",
  "source_url": "https://www.trai.gov.in/release-publication/regulations",
  "coverage": {
    "categories": "3 TRAI regulation categories",
    "regulations": "240 regulations and directions",
    "orders": "40 tariff orders and notices",
    "jurisdictions": ["India"],
    "sectors": ["Telecom", "Broadband", "ISP", "Satellite"]
  },
  "tools": [
    { "name": "in_trai_search_regulations", "description": "..." },
    { "name": "in_trai_get_regulation", "description": "..." },
    { "name": "in_trai_search_directions", "description": "..." },
    { "name": "in_trai_list_categories", "description": "..." },
    { "name": "in_trai_about", "description": "..." },
    { "name": "in_trai_list_sources", "description": "..." }
  ],
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```

---

## in_trai_list_sources

Return data provenance information: which TRAI sources are indexed, retrieval method, update frequency, and licensing terms.

### Parameters

None.

### Example Call

```json
{
  "name": "in_trai_list_sources",
  "arguments": {}
}
```

### Example Response

```json
{
  "sources_yml": "schema_version: \"1.0\"\nmcp_name: \"India TRAI Telecom Regulation MCP\"\n...",
  "note": "Data is sourced from official TRAI public publications. See sources.yml for full provenance.",
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: monthly",
    "source_url": "https://www.trai.gov.in/release-publication/regulations"
  }
}
```
