/**
 * Seed the TRAI database with sample categories, regulations, and directions.
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["TRAI_DB_PATH"] ?? "data/trai.db";
const force = process.argv.includes("--force");

const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);
console.log(`Database initialised at ${DB_PATH}`);

// --- Categories (frameworks) --------------------------------------------------

interface CategoryRow {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  control_count: number;
  effective_date: string;
  pdf_url: string;
}

const categories: CategoryRow[] = [
  {
    id: "trai-regulations",
    name: "TRAI Regulations",
    version: "Current (2024)",
    domain: "Telecom Regulation",
    description:
      "Primary regulations issued by the Telecom Regulatory Authority of India (TRAI) under the " +
      "TRAI Act 1997. Covers quality of service, consumer protection, tariff, interconnection, " +
      "unsolicited commercial communications, and broadband. Binding on all licensed telecom " +
      "service providers (TSPs) including mobile, fixed-line, broadband, and internet service providers.",
    control_count: 80,
    effective_date: "1997-02-20",
    pdf_url: "https://www.trai.gov.in/release-publication/regulations",
  },
  {
    id: "trai-directions",
    name: "TRAI Directions",
    version: "Current (2024)",
    domain: "Operator Compliance",
    description:
      "Directions issued by TRAI to telecom service providers under Section 13 of the TRAI Act. " +
      "Directions carry immediate compliance obligation. Common topics: call drop reporting, " +
      "network quality benchmarks, UCC compliance, subscriber verification, and data reporting. " +
      "Non-compliance attracts penalties under Section 29 of the TRAI Act.",
    control_count: 120,
    effective_date: "1997-02-20",
    pdf_url: "https://www.trai.gov.in/release-publication/directions",
  },
  {
    id: "trai-orders",
    name: "TRAI Tariff & Other Orders",
    version: "Current (2024)",
    domain: "Tariff Regulation",
    description:
      "Tariff orders and other orders issued by TRAI under Section 11 of the TRAI Act. " +
      "Includes National Roaming Tariff Orders, Interconnect Usage Charges orders, " +
      "Reference Interconnect Offers, and miscellaneous administrative orders. " +
      "Tariff orders determine the pricing framework for various telecom services.",
    control_count: 40,
    effective_date: "1997-02-20",
    pdf_url: "https://www.trai.gov.in/release-publication/orders",
  },
];

const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO frameworks (id, name, version, domain, description, control_count, effective_date, pdf_url) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const c of categories) {
  insertCategory.run(
    c.id, c.name, c.version, c.domain, c.description, c.control_count, c.effective_date, c.pdf_url,
  );
}
console.log(`Inserted ${categories.length} categories`);

// --- Regulations (controls) ---------------------------------------------------

interface RegulationRow {
  framework_id: string;
  control_ref: string;
  domain: string;
  subdomain: string;
  title: string;
  description: string;
  maturity_level: string;
  priority: string;
}

const regulations: RegulationRow[] = [
  // Quality of Service Regulations
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-QOS-2016-001",
    domain: "Quality of Service",
    subdomain: "Voice Quality",
    title: "Quality of Service (Code of Practice for Metering and Billing Accuracy) Regulations 2006 (Amendment 2016)",
    description:
      "TRAI QoS Regulation mandating telecom service providers to maintain defined benchmarks for " +
      "voice call quality across mobile and fixed-line networks. Key benchmarks: call setup success rate " +
      "≥95% for mobile; call drop rate ≤2% per connection per month; voice quality score meeting ITU-T P.800 " +
      "standards. TSPs must submit monthly Quality of Service reports to TRAI. Non-compliance attracts " +
      "financial disincentive of ₹50,000 per parameter per service area per quarter. Measurement methodology " +
      "follows TRAI-prescribed drive tests and subscriber feedback surveys.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-QOS-BROAD-2021",
    domain: "Quality of Service",
    subdomain: "Broadband",
    title: "Quality of Service (Broadband) Regulations 2021",
    description:
      "TRAI regulations prescribing minimum quality of service benchmarks for broadband service providers " +
      "in India. Mandatory benchmarks: minimum download speed of 512 Kbps for basic broadband; latency " +
      "≤150ms for fixed broadband; packet loss ≤1%. ISPs must publish broadband speed data on their websites " +
      "monthly. TRAI's broadband speed test app (MySpeed) provides independent measurement. Providers offering " +
      "plans above 2 Mbps must deliver at least 60% of promised speed during peak hours. Annual audit by " +
      "TRAI-designated agencies required for major ISPs.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-UCC-2019",
    domain: "Consumer Protection",
    subdomain: "Unsolicited Commercial Communications",
    title: "Telecom Commercial Communications Customer Preference Regulations 2018 (Amendment 2019)",
    description:
      "Comprehensive TRAI regulation governing unsolicited commercial communications (UCC) in India, " +
      "commonly known as the Do Not Disturb (DND) framework. Establishes the Distributed Ledger Technology " +
      "(DLT) platform for registering telemarketers, senders, and message templates. Key requirements: " +
      "all commercial communicators must register on DLT; explicit consent required for promotional calls/SMS; " +
      "subscribers registered on National Customer Preference Register (NCPR) must not receive unsolicited " +
      "commercial communications; TSPs must block unregistered telemarketers within 2 hours of complaint. " +
      "Penalties: ₹1,500 per UCC complaint on TSP; license conditions can be invoked for persistent violations.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-CONSUMER-2012",
    domain: "Consumer Protection",
    subdomain: "Consumer Grievance",
    title: "Telecom Consumers Protection and Redressal of Grievances Regulations 2012",
    description:
      "TRAI regulation establishing the framework for consumer grievance redressal in the telecom sector. " +
      "Requires all TSPs to establish a two-tier grievance redressal mechanism: (1) Call Centre at Level 1 " +
      "with 3-business-day resolution; (2) Appellate Authority at Level 2 with 39-day resolution. TSPs must " +
      "provide a dedicated toll-free helpline. Unresolved complaints can be escalated to TRAI. TSPs must " +
      "maintain records of all complaints for 3 years. TRAI's Consumer Affairs and User Protection (CAUP) " +
      "division monitors compliance. Non-compliance penalties under TRAI Act Section 29.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-TARIFF-2017",
    domain: "Tariff",
    subdomain: "Tariff Transparency",
    title: "Telecom Consumers (Protection and Disclosure of Tariff) Regulation 2004 (Amendment 2017)",
    description:
      "TRAI regulation mandating transparency in tariff disclosure to telecom consumers. Requirements: " +
      "all tariff plans must be published on TSP website with plain-language summaries; effective tariff " +
      "date must be announced 7 days in advance; subscribers must be notified of tariff changes via SMS " +
      "before implementation; no hidden charges permitted; promotional offers must disclose all conditions " +
      "including validity, speed throttling after FUP, and auto-renewal terms. TSPs must provide itemised " +
      "billing on request at no charge. Standardised tariff voucher formats prescribed by TRAI.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-INTER-2017",
    domain: "Interconnection",
    subdomain: "Interconnect Agreements",
    title: "Interconnection Regulations 2018",
    description:
      "TRAI regulations governing interconnection between telecom service providers in India. " +
      "Mandates non-discriminatory access: TSPs with significant market power must provide interconnection " +
      "within 90 days of request; interconnect point provisioning must be technically and commercially " +
      "reasonable. Reference Interconnect Offer (RIO) must be published and submitted to TRAI for approval. " +
      "Dispute resolution: interconnect disputes resolved by TRAI within 60 days. Point of Interconnect (PoI) " +
      "congestion must not exceed 0.5% of traffic. TSPs must share PoI capacity data with TRAI quarterly.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-NUM-2003",
    domain: "Numbering",
    subdomain: "Number Portability",
    title: "Mobile Number Portability Regulations 2009 (Amendment 2018)",
    description:
      "TRAI regulation governing mobile number portability (MNP) in India. Key requirements: " +
      "porting request must be processed within 2 working days (reduced from 7 days); porting must be " +
      "completed between 10 PM and 5 AM to minimise service disruption; TSPs must not create artificial " +
      "barriers to porting; cancellation of porting request only on subscriber's written request; " +
      "MNP central database maintained by two Central Nodal Agencies (CNAs). Penalty for delayed porting: " +
      "₹10,000 per working day per subscriber. TSPs must submit monthly MNP performance reports to TRAI.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-ROAM-2014",
    domain: "Roaming",
    subdomain: "National Roaming",
    title: "Telecom (National Roaming) Regulations 2014",
    description:
      "TRAI regulation on national roaming charges and quality of service for mobile subscribers roaming " +
      "within India. Key provisions: visited network TSPs must provide roaming services to all home network " +
      "subscribers on non-discriminatory terms; roaming tariffs are subject to TRAI ceiling rates; home " +
      "network TSP must clearly inform subscribers of applicable roaming rates before roaming commences; " +
      "data roaming speeds must not be artificially throttled relative to home network speeds; " +
      "TSPs must ensure seamless handover across network boundaries. Monthly roaming quality reports " +
      "must be submitted to TRAI.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-NET-NEUTRAL-2016",
    domain: "Internet Regulation",
    subdomain: "Net Neutrality",
    title: "Prohibition of Discriminatory Tariffs for Data Services Regulations 2016",
    description:
      "TRAI net neutrality regulation prohibiting differential pricing of data services based on content. " +
      "Key prohibitions: no data pricing based on websites or platforms accessed; no zero-rating arrangements " +
      "that discriminate between content providers; no speed throttling based on content type or source. " +
      "Permissible practices: data speed differentiation based on congestion management; specialised services " +
      "on dedicated capacity. TSPs violating this regulation face penalties of ₹50,000 per day of violation " +
      "with a maximum of ₹50 lakh per violation. TRAI may also recommend licence revocation for persistent " +
      "violation of net neutrality principles.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-MVNO-2008",
    domain: "Licensing",
    subdomain: "MVNO Framework",
    title: "Mobile Virtual Network Operator (MVNO) Guidelines 2008",
    description:
      "TRAI framework governing Mobile Virtual Network Operators (MVNOs) in India. MVNOs must obtain " +
      "a licence from DOT and sign an agreement with a host TSP (Mobile Network Operator). " +
      "TRAI-prescribed agreement terms: host TSP must offer spectrum and network services on " +
      "non-discriminatory commercial terms; MVNO may offer its own tariff plans within TRAI-prescribed ceilings; " +
      "quality of service obligations extend to the MVNO; MVNO subscriber data must be maintained separately " +
      "from host TSP data; disputes between MVNO and host TSP resolved by TRAI within 60 days.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-OTT-2020",
    domain: "Internet Regulation",
    subdomain: "OTT Communication",
    title: "Over-the-Top Communication Services Consultation Paper 2020",
    description:
      "TRAI consultation and emerging regulatory framework for Over-The-Top (OTT) communication services " +
      "such as WhatsApp, Telegram, Skype, and Google Meet. TRAI has consulted on a light-touch " +
      "regulatory approach. Current position: OTT services are not classified as telecom services under " +
      "the Indian Telegraph Act. Key issues under consideration: regulatory parity between OTT and TSPs, " +
      "emergency services access, lawful interception obligations, data privacy, and quality of service " +
      "measurement for VoIP calls. Formal regulation expected to follow Telecommunications Act 2023 " +
      "implementation.",
    maturity_level: "Consultative",
    priority: "Medium",
  },
  {
    framework_id: "trai-regulations",
    control_ref: "TRAI-REG-SATELLITE-2022",
    domain: "Satellite Services",
    subdomain: "Satcom Regulation",
    title: "Recommendations on Satellite-based Communications Services 2022",
    description:
      "TRAI recommendations on licensing and regulatory framework for satellite-based communication " +
      "services in India, including Low Earth Orbit (LEO) satellite broadband. Key recommendations: " +
      "light-touch licensing for satellite internet service providers; spectrum assignment through " +
      "administrative process rather than auction for satellite spectrum; satellite operators must " +
      "implement anti-jamming measures and interference coordination; quality of service benchmarks " +
      "for satellite broadband aligned with terrestrial broadband QoS regulations; data localisation " +
      "requirements for satellite operators serving Indian subscribers.",
    maturity_level: "Recommendations",
    priority: "Medium",
  },

  // Directions
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2021-QOS-001",
    domain: "Quality of Service",
    subdomain: "Call Drop",
    title: "Direction on Call Drop Reporting and Financial Disincentive Framework",
    description:
      "TRAI direction to all mobile service providers requiring mandatory reporting of call drop rates " +
      "and implementation of the financial disincentive framework for QoS non-compliance. " +
      "Key obligations: TSPs must submit daily network quality data via TRAI's monitoring portal; " +
      "call drop rate exceeding 2% monthly average triggers automatic financial disincentive computation; " +
      "TRAI field offices conduct quarterly drive tests to verify reported data; TSPs must provide " +
      "root-cause analysis for service areas with persistent call drop violations within 30 days; " +
      "network improvement plans must be submitted to TRAI if violations persist for 3 consecutive months.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2022-DLT-001",
    domain: "Consumer Protection",
    subdomain: "DLT Platform",
    title: "Direction on DLT Platform Implementation for UCC Compliance",
    description:
      "TRAI direction requiring all telecom service providers to implement the Distributed Ledger " +
      "Technology (DLT) platform for unsolicited commercial communication control. Key compliance " +
      "requirements: all TSPs must be connected to the DLT platform and implement header and template " +
      "scrubbing for commercial SMS; unregistered headers and templates must be blocked within 2 hours; " +
      "TSPs must process subscriber preferences (DND registration) within 7 days; complaint resolution " +
      "for UCC complaints within 7 working days; monthly compliance reports to TRAI. " +
      "TSPs must share DLT access with TRAI for audit purposes.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2020-DATA-001",
    domain: "Data Reporting",
    subdomain: "Subscriber Data",
    title: "Direction on Monthly Subscriber Data Reporting Format",
    description:
      "TRAI direction specifying the format and timeline for monthly subscriber data reporting " +
      "by telecom service providers. Data to be reported: wireless subscriber count by circle and " +
      "technology (2G/3G/4G/5G); broadband subscriber count by technology (fixed/mobile); VoIP " +
      "subscribers; active vs inactive breakdown; data on porting (MNP); revenue reported to TRAI. " +
      "Reporting deadline: 20th of the following month. Non-compliance: first instance advisory; " +
      "repeat non-compliance attracts penalty under TRAI Act. TRAI publishes aggregate subscriber data " +
      "monthly on its website.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2021-5G-001",
    domain: "Quality of Service",
    subdomain: "5G Rollout",
    title: "Direction on 5G Service Rollout Reporting",
    description:
      "TRAI direction to TSPs licensed for 5G spectrum requiring reporting of 5G network rollout " +
      "progress. Compliance obligations: monthly rollout reports covering districts where 5G service " +
      "is live; coverage map updates on TSP websites; subscriber statistics on 5G adoption; spectrum " +
      "utilisation data; quality of service measurements for 5G (latency, throughput, reliability); " +
      "TRAI field units to conduct independent 5G performance measurement in major cities quarterly. " +
      "TSPs must publish 5G coverage maps on their websites, updated at least monthly.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2023-INT-001",
    domain: "Interconnection",
    subdomain: "PoI Congestion",
    title: "Direction on Point of Interconnect (PoI) Congestion Reporting",
    description:
      "TRAI direction requiring TSPs to report Point of Interconnect (PoI) congestion data and " +
      "maintain congestion below prescribed thresholds. Key requirements: PoI congestion must not " +
      "exceed 0.5% of traffic in any hour; TSPs must report congestion data weekly via TRAI portal; " +
      "congested PoIs must be augmented within 45 days of TRAI notice; failure to augment after " +
      "notice attracts ₹1 lakh per PoI per week penalty; TSPs must maintain PoI capacity data for " +
      "3 years for audit; TRAI may mandate augmentation proactively if congestion trends are adverse.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2022-VER-001",
    domain: "Consumer Protection",
    subdomain: "Subscriber Verification",
    title: "Direction on Subscriber Identity Verification and eKYC",
    description:
      "TRAI direction on subscriber identity verification requirements for new SIM connections, " +
      "replacing paper-based KYC with electronic KYC (eKYC). Requirements: all new SIM activations " +
      "must use Aadhaar-based biometric eKYC or equivalent digital verification; document-based KYC " +
      "permitted only in exceptional cases; TSP customer service points must have iris/fingerprint " +
      "scanners for biometric verification; reactivation of deactivated numbers requires fresh eKYC; " +
      "TSPs must detect and report bulk SIM acquisition attempts (>9 connections per person) to DOT; " +
      "KYC records must be retained for 3 years after deactivation.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2023-SPAM-001",
    domain: "Consumer Protection",
    subdomain: "Spam Control",
    title: "Direction on Blocking Fraudulent International Calls Showing Indian Numbers",
    description:
      "TRAI direction requiring TSPs to implement technical measures to block international calls " +
      "falsely presenting Indian CLI (Calling Line Identification). These calls are used for " +
      "telecom fraud including OTP interception and impersonation of government agencies. " +
      "Technical requirements: TSPs must implement STIR/SHAKEN-equivalent CLI validation for " +
      "international traffic; calls with spoofed Indian CLIs must be blocked at international gateways; " +
      "TSPs must implement AI-based fraud detection for suspicious call patterns; subscriber complaint " +
      "portal for reporting fraudulent calls must be established; weekly reports on blocked calls to TRAI.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-directions",
    control_ref: "TRAI-DIR-2021-COV-001",
    domain: "Quality of Service",
    subdomain: "Rural Coverage",
    title: "Direction on Rural Coverage Expansion and Reporting",
    description:
      "TRAI direction on mobile network coverage in rural and remote areas of India. Reporting " +
      "requirements: TSPs must submit quarterly coverage maps showing 2G, 4G, and 5G coverage by " +
      "census village; uncovered villages (population >500) must be reported to TRAI and DOT for " +
      "Universal Service Obligation Fund (USOF) subsidy consideration; TSPs with USO obligations " +
      "must report on USOF project progress monthly; right-of-way disputes for tower installation " +
      "must be escalated to TRAI if unresolved within 60 days; TRAI publishes village-level coverage " +
      "data on its website for public transparency.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
  {
    framework_id: "trai-orders",
    control_ref: "TRAI-ORD-IUC-2017",
    domain: "Tariff",
    subdomain: "Interconnect Usage Charges",
    title: "Interconnect Usage Charges (IUC) Order 2017 (Phase-out to Zero 2021)",
    description:
      "TRAI tariff order on Interconnect Usage Charges (IUC) — the charges paid by the calling " +
      "network TSP to the receiving network TSP for terminating calls. Key milestones: IUC reduced " +
      "from ₹0.14/min to ₹0.06/min effective 1 October 2017; originally proposed to be reduced to " +
      "zero in January 2020, deferred to January 2021. Final IUC: ₹0.06/min effective from 1 January 2021 " +
      "pending switch to bill-and-keep regime. Impact: levelled playing field between new entrants and " +
      "incumbents; triggered significant disruption in voice call pricing. TSPs must report IUC " +
      "settlements quarterly to TRAI.",
    maturity_level: "Mandatory",
    priority: "High",
  },
  {
    framework_id: "trai-orders",
    control_ref: "TRAI-ORD-ROAM-2019",
    domain: "Tariff",
    subdomain: "National Roaming",
    title: "National Roaming Tariff Order 2019",
    description:
      "TRAI tariff order specifying ceiling rates for national roaming in India. Key tariff ceilings: " +
      "voice calls while roaming: ceiling at ₹1.00/min (incoming); data roaming: ceiling aligned with " +
      "home network data tariff; no separate roaming charges permitted for subscribers on unlimited plans; " +
      "TSPs must publish roaming tariff prominently on their websites and through SMS to subscribers " +
      "entering roaming areas; auto-notification of roaming tariffs mandatory upon SIM registration in " +
      "visited network. TSPs must submit monthly compliance statements on roaming tariff adherence.",
    maturity_level: "Mandatory",
    priority: "Medium",
  },
];

const insertRegulation = db.prepare(
  "INSERT OR IGNORE INTO controls " +
    "(framework_id, control_ref, domain, subdomain, title, description, maturity_level, priority) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const r of regulations) {
  insertRegulation.run(
    r.framework_id, r.control_ref, r.domain, r.subdomain, r.title,
    r.description, r.maturity_level, r.priority,
  );
}
console.log(`Inserted ${regulations.length} regulations`);

// --- Orders and Notices (circulars) -------------------------------------------

interface OrderRow {
  reference: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  full_text: string;
  pdf_url: string;
  status: string;
}

const orders: OrderRow[] = [
  {
    reference: "TRAI-NOT-2023-QOS-001",
    title: "TRAI Notice on QoS Non-Compliance for Q4 2022",
    date: "2023-03-15",
    category: "Quality of Service",
    summary:
      "TRAI show-cause notice to three major TSPs for persistent call drop rate violations in " +
      "Maharashtra, Karnataka, and Delhi service areas during Q4 2022, requiring response within 30 days.",
    full_text:
      "TRAI Notice on QoS Non-Compliance for Q4 2022. " +
      "Background: TRAI monitoring data for Q4 2022 (October-December 2022) shows that three licensed " +
      "mobile service providers exceeded the prescribed call drop benchmark of 2% in multiple service areas. " +
      "Violations Identified: " +
      "TSP-A: Call drop rate of 3.8% in Maharashtra, 3.1% in Delhi for October and November 2022. " +
      "TSP-B: Call drop rate of 4.2% in Karnataka for all three months of Q4. " +
      "TSP-C: Call drop rate of 2.9% in Rajasthan for December 2022. " +
      "Show-Cause Requirements: TSPs are required to submit within 30 days: " +
      "(1) Root-cause analysis for identified violations; " +
      "(2) Network improvement plan with specific milestones; " +
      "(3) Projected timeline for return to compliance. " +
      "Financial Disincentive: Subject to the response received and TRAI review, financial disincentive " +
      "of ₹50,000 per non-compliant service area per quarter may be imposed as per QoS Regulations. " +
      "Continued violation may result in reference to DOT for licence condition enforcement.",
    pdf_url: "https://www.trai.gov.in/sites/default/files/Notice_QoS_NonCompliance_Q42022.pdf",
    status: "active",
  },
  {
    reference: "TRAI-ORD-PROC-2022-001",
    title: "Order on Procedure for Assessment of Financial Disincentive under QoS Regulations",
    date: "2022-11-01",
    category: "Quality of Service",
    summary:
      "TRAI order establishing the procedure for computing and recovering financial disincentives " +
      "from TSPs under the Quality of Service (Code of Practice for Metering and Billing Accuracy) " +
      "Regulations and associated amendments.",
    full_text:
      "TRAI Order on Procedure for Assessment of Financial Disincentive under QoS Regulations (2022). " +
      "Purpose: To establish a transparent, consistent procedure for computing financial disincentives " +
      "imposed on telecom service providers for QoS non-compliance. " +
      "Assessment Process: " +
      "(1) Data Collection — TRAI collects monthly QoS performance reports from TSPs via the Automatic " +
      "Monitoring System (AMS) portal. TRAI also conducts independent drive tests quarterly. " +
      "(2) Parameter Evaluation — Each QoS parameter is compared against the prescribed benchmark. " +
      "Violations are computed per parameter, per service area, per month. " +
      "(3) Computation — Financial disincentive: ₹50,000 per parameter per service area per quarter where " +
      "non-compliance is established in 2 of 3 months. " +
      "(4) Show-Cause — TSP is issued a show-cause notice with data evidence. TSP has 30 days to respond. " +
      "(5) Final Order — After considering TSP response, TRAI issues final order and recovers disincentive " +
      "within 60 days. " +
      "Appeal: TSPs may appeal to TDSAT (Telecom Disputes Settlement and Appellate Tribunal) within 30 days " +
      "of TRAI's final order. Payment of disincentive is not stayed by appeal unless TDSAT so orders.",
    pdf_url: "https://www.trai.gov.in/sites/default/files/Order_FinancialDisincentive_Procedure_2022.pdf",
    status: "active",
  },
  {
    reference: "TRAI-NOT-2023-UCC-001",
    title: "TRAI Notice on DLT Platform Non-Compliance",
    date: "2023-06-01",
    category: "Consumer Protection",
    summary:
      "TRAI show-cause notice to multiple TSPs for failure to implement DLT-based blocking of " +
      "unregistered telemarketers within the prescribed 2-hour window, resulting in continued " +
      "delivery of unsolicited commercial communications to DND-registered subscribers.",
    full_text:
      "TRAI Notice on DLT Platform Non-Compliance (2023). " +
      "Background: TRAI analysis of UCC complaint data for January-May 2023 reveals systemic " +
      "failures by multiple TSPs in implementing the DLT platform blocking requirements. " +
      "Specific Violations: " +
      "(1) Delayed Blocking — Several TSPs took 4-24 hours to block reported unregistered telemarketers, " +
      "against the prescribed 2-hour maximum. " +
      "(2) Incomplete Header Scrubbing — DLT-registered headers found to be bypassing scrubbing controls " +
      "in some instances, suggesting implementation gaps. " +
      "(3) Complaint Resolution Delays — Average complaint resolution time of 12 working days against " +
      "the prescribed 7 working days. " +
      "Required Actions: TSPs must submit within 15 days: " +
      "(a) Detailed technical audit of DLT implementation; " +
      "(b) Root-cause analysis for blocking delays; " +
      "(c) Action plan with measurable targets for achieving 2-hour blocking. " +
      "Regulatory Consequence: Persistent non-compliance may result in financial penalty of ₹1,500 per " +
      "UCC complaint plus recommendation to DOT for licence action.",
    pdf_url: "https://www.trai.gov.in/sites/default/files/Notice_DLT_NonCompliance_2023.pdf",
    status: "active",
  },
  {
    reference: "TRAI-ORD-MNP-2018-001",
    title: "Order on Reduction of Mobile Number Portability Processing Time",
    date: "2018-07-01",
    category: "Number Portability",
    summary:
      "TRAI order reducing the mobile number portability (MNP) processing time from 7 working days " +
      "to 2 working days, effective 16 December 2018, to reduce barriers to subscriber switching " +
      "between operators.",
    full_text:
      "TRAI Order on Reduction of Mobile Number Portability Processing Time (2018). " +
      "Background: TRAI review of the MNP ecosystem found that the 7-working-day porting timeline " +
      "created an impediment to effective competition. International benchmarks show many markets " +
      "achieve same-day or next-day porting. " +
      "Key Changes: " +
      "(1) Porting window reduced from 7 working days to 2 working days (excluding Sundays and public holidays). " +
      "(2) Porting to take place in a defined window (10 PM to 5 AM) to minimise service disruption. " +
      "(3) Invalid UPC (Unique Porting Code) cannot be used as reason for rejection — porting must proceed " +
      "if subscriber identity is verified. " +
      "(4) Operators cannot make any outbound call to subscribers who have initiated porting request. " +
      "Subscriber Protection: Any attempt by the donor operator to prevent or discourage porting after " +
      "UPC generation constitutes violation of MNP regulations. TRAI can impose penalty of ₹10,000 per " +
      "subscriber per day of delay beyond the 2-working-day window. " +
      "Implementation: Central Nodal Agencies updated porting systems to accommodate 2-day timeline by " +
      "16 December 2018.",
    pdf_url: "https://www.trai.gov.in/sites/default/files/Order_MNP_ProcessingTime_2018.pdf",
    status: "active",
  },
  {
    reference: "TRAI-ORD-BROAD-2021-001",
    title: "Order on Mandatory Disclosure of Broadband Speeds",
    date: "2021-02-01",
    category: "Broadband",
    summary:
      "TRAI order requiring all internet service providers to mandatorily disclose broadband speed " +
      "data through TRAI's MySpeed portal, and to publish monthly speed data on their own websites, " +
      "enabling informed consumer choice.",
    full_text:
      "TRAI Order on Mandatory Disclosure of Broadband Speeds (2021). " +
      "Background: Consumer complaints about mismatch between advertised and delivered broadband speeds " +
      "have increased significantly. TRAI's MySpeed platform provides independent measurement, but " +
      "mandating TSP self-reporting creates a benchmark for accountability. " +
      "Mandatory Disclosure Requirements: " +
      "(1) ISPs must integrate their networks with the TRAI MySpeed portal to enable standardised speed measurement. " +
      "(2) ISPs must publish monthly average broadband speed data on their websites, broken down by: " +
      "fixed/mobile; technology (FTTH, DSL, 4G, 5G); peak vs off-peak hours; download and upload speeds. " +
      "(3) Advertised speeds must reflect the speed achievable by at least 85% of subscribers on that plan. " +
      "(4) Plans that include FUP (Fair Usage Policy) speed reduction after data cap must disclose post-FUP speed " +
      "prominently in plan description. " +
      "Penalty: Non-disclosure within prescribed timeline attracts financial penalty. " +
      "TRAI will publish a comparative speed dashboard for all major ISPs quarterly.",
    pdf_url: "https://www.trai.gov.in/sites/default/files/Order_BroadbandSpeed_Disclosure_2021.pdf",
    status: "active",
  },
];

const insertOrder = db.prepare(
  "INSERT OR IGNORE INTO circulars (reference, title, date, category, summary, full_text, pdf_url, status) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const o of orders) {
  insertOrder.run(
    o.reference, o.title, o.date, o.category, o.summary, o.full_text, o.pdf_url, o.status,
  );
}
console.log(`Inserted ${orders.length} orders and notices`);

// --- Summary ------------------------------------------------------------------

const fc = (db.prepare("SELECT COUNT(*) AS n FROM frameworks").get() as { n: number }).n;
const rc = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as { n: number }).n;
const oc = (db.prepare("SELECT COUNT(*) AS n FROM circulars").get() as { n: number }).n;

console.log(`
Database summary:
  Categories          : ${fc}
  Regulations         : ${rc}
  Orders & Notices    : ${oc}

Seed complete.`);
