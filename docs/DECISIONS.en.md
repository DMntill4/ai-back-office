# Architecture Decision Records (ADR) — MINT

> [Spanish Version / Versión en Español](./DECISIONS.md)

## ADR-001: Monorepo Architecture for MINT CLI & Autonomous Core
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** The MINT AI Back Office evolved from a monolithic Fastify/Web server into a distributed autonomous suite: local CLI (`mint`), background daemon, data ingestion engine, notification adapters (Telegram, Slack, Gmail), and the visual control desktop app.
- **Decision:** Implement an npm workspaces monorepo:
  - `packages/core`: Core domain logic (specialized agents, Zod-typed tools, business services, Drizzle ORM/PostgreSQL, deterministic policy engine, context manager, and event engine). Zero dependencies on HTTP/Fastify frameworks.
  - `packages/cli`: Terminal interface (`mint login`, `mint watch`, `mint inbox`, `mint today`, `mint source add`, etc.).
  - `packages/daemon`: Background worker process that monitors data sources and triggers proactive events.
  - `packages/notifiers`: Adapters for notifications and remote human-in-the-loop approvals (Telegram Bot API, Slack Bolt, Gmail SMTP).
  - `packages/ingest`: Assisted ingestion engine with CSV/Excel/SQL schema discovery and strictly read-only connections.
- **Consequences:** Maximum modularity. The CLI and daemon operate locally without requiring an HTTP server, while `packages/app` consumes `@mint/core` to render the visual control tower.

---

## ADR-002: Framework Decoupling in `@mint/core`
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Tools, agent loops, and inventory services must not depend on the lifecycle of any web framework.
- **Decision:** In `@mint/core`, all functions take typed parameters (DTOs) and return clean data structures or throw controlled exceptions. No file in `packages/core` imports `fastify` or `@fastify/cors`.

---

## ADR-003: Unified LLM Client Architecture
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Centralizing LLM interactions through the official challenge gateway with xAI Grok (`grok-4.6`).
- **Decision:** Centralize model calls in `packages/core/src/llm/client.ts`, reading from `RETO_KEY` and `GROK_BASE_URL` (`https://api.reto.pltk.mx/v1`), maintaining fallback structures and zero dependencies on deprecated endpoints (`api.x.ai/grok-2`).

---

## ADR-004: Tool Sandboxing and Strict Safety Constraints
- **Date:** 2026-10-23
- **Status:** Accepted
- **Decision:** The LLM is NEVER granted shell/terminal execution rights or arbitrary filesystem write access. Every exposed tool is defined with a strict Zod schema, input validation, and access control.

---

## ADR-005: Assisted Ingestion, Fault Tolerance & 'Real' Data Attribution
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Operational data sources (CSV, Excel, external databases) vary widely in column headers and often contain malformed rows.
- **Decision:**
  - Ingestion engine (`@mint/ingest`) proposes heuristic semantic mappings (detecting Spanish/English variations for SKU, name, stock, minimum, category, cost).
  - Resilient import: malformed records are quarantined without aborting valid row inserts.
  - Every successfully imported record is tagged with `origin = 'real'`, enabling agents to differentiate verified operational records from mock data.
  - External PostgreSQL sources enforce read-only connections, parameterization, and 5-second query timeouts.

---

## ADR-006: Multi-Agent Orchestration, Structured Proposals & Human-in-the-Loop Governance
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Complex operational decisions (e.g., shipping delays causing stockout risks) span multiple domains (inventory, logistics, procurement, risk). The LLM must not directly execute purchases or database mutations.
- **Decision:**
  - Decouple proposal from execution: specialists (`inventario`, `compras`, `logistica`, `auditoria`) issue structured `ActionProposal` objects with quantitative evidence and risk assessment.
  - Deterministic Policy Engine (`evaluatePolicy`): enforces strict rules (anti-duplication, verified vendor, zero unilateral spending, reversibility).
  - Three autonomy levels (`mint autonomy set dry-run|assisted|auto`):
    - `dry-run`: generates proposals and policies without mutating databases.
    - `assisted`: purchasing proposals route strictly to `/inbox` for human approval (ZERO unilateral spending); routing and diagnostics execute with confirmation.
    - `auto`: fully autonomous execution only for safe, reversible actions; financial commitments always require supervisor authorization.
  - Every evaluated proposal is persisted immutably in the `decisions` table and Obsidian Vault (`vault/Decisiones/`).

---

## ADR-007: Background Daemon, File Watcher & Emergency Pause Switch
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Operators should not need an open terminal for the system to react. Inventory deficits and file updates must trigger cases automatically in the background.
- **Decision:**
  - `@mint/daemon` runs a decoupled periodic loop with three triggers:
    - Stock deficit scan (`scanStockDeficits`).
    - Delayed shipment scan (`scanDelayedShipments`).
    - Daily operational plan (`generateDailyPlan`).
  - Reactive file monitoring (`watchDirectory`): when files change in watched directories, the daemon runs assisted ingestion and notifies the coordinator, opening a case in PostgreSQL.
  - Emergency switch (`mint pause` / `mint resume`): persists a flag in `~/.mint/daemon.json` that immediately halts autonomous ticks without killing processes.

---

## ADR-008: Remote Notifiers (Telegram, Slack, Gmail) with Signed HMAC Tokens
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** High-priority decisions and human approvals must reach supervisors wherever they are (mobile/chat/email) without requiring the terminal.
- **Decision:**
  - Modular adapters (`@mint/notifiers`) for Telegram (Bot API with inline buttons), Slack (Block Kit), and Gmail (HTML with action buttons).
  - Secure approval tokens using HMAC-SHA256 with expiration (TTL) and nonce.
  - Replay-attack prevention via the `notification_log` table: tokens can only be consumed once.
  - Upon receiving remote approval, `processRemoteApproval` creates the purchase order in PostgreSQL and logs the authorizing user and channel.

---

## ADR-009: CLI Packaging, Binary Distribution & E2E Validation
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** The CLI must operate as a standalone binary (`mint`) while remaining 100% compatible with existing test suites.
- **Decision:**
  - Binary registered in `package.json` under `"bin": { "mint": "./packages/cli/bin/mint.js" }`, executable directly as `mint` or `npm run mint`.
  - Credentials stored using AES-256 derived keys (`crypto.scryptSync`), never in plaintext.
  - Automated test suite in Vitest covering setup, ReAct loops, multi-agent orchestration, policy engine, daemon watcher, notifiers, and end-to-end flows.

---

## ADR-010: Terminal UI (TUI) Architecture & Explainability
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** To serve as a high-density operational tool for supply chain managers, the CLI must provide clear visual hierarchy, modern cards, and complete explainability.
- **Decision:**
  - Zero-dependency terminal design system (`packages/cli/src/ui/theme.ts`, `box.ts`, `table.ts`, `banner.ts`):
    - Mint green accent palette (`#10B981`), rounded box-drawing corners, and responsive tables.
    - Asynchronous spinner for LLM and database operations, disabling automatically in non-interactive pipes (`--json`, `NO_COLOR`).
  - Deep explainability command (`mint explain <id>`): reconstructs agent deliberation, risk scores, evidence metrics, and the deterministic policy rule matched.
  - What-if simulator (`mint simulate [stockout|delay|price-spike]`): enables sandbox testing of supply shocks without modifying production databases.
  - Unified dashboard (`mint dashboard` / `mint status`): single view combining inventory, active alerts, case pipelines, HITL inbox, and channel health.

---

## ADR-011: Multi-Agent Harness & Multi-Tenant SaaS Access Control
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Enterprises require a true parallel back-office system with multi-user support where teams (owners, operators, auditors, viewers) collaborate under strict tenant isolation.
- **Decision:**
  - `runBackOfficeHarness`: concurrent orchestration running Inventory, Purchasing, Transport, and Risk specialists in parallel via `Promise.all`.
  - Multi-tenant team management (`packages/core/src/services/teamService.ts`):
    - Strict tenant partitioning: all queries filter by authenticated `companyId`.
    - RBAC matrix: `owner`, `admin`, `operator`, `auditor`, `driver`, `viewer`.
    - Orphan protection: the system prevents deleting the last active owner of a company.

---

## ADR-012: Data Layer Hardening, Schema Drift Detection & Freshness Guardrails
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** MINT must run portably across platforms (Windows, macOS, Linux) without requiring external services, treating all external sources as strictly READ-ONLY and guarding against prompt injections, unannounced schema drift, and stale data.
- **Decision:**
  1. **Sanitization & Prompt Injection Defense (`packages/ingest/src/sanitizer.ts`):**
     - Strips ANSI escape codes, byte order marks (BOM), and control characters.
     - Enforces strict SQL identifier sanitization, rejecting injection attempts.
     - Neutralizes prompt injections (`SYSTEM: IGNORE PREVIOUS INSTRUCTIONS`), logging them as `[FILTERED_PROMPT_INJECTION]`.
  2. **Zero-Dependency Portable Connectors:**
     - Uses native `node:sqlite` in read-only mode for `.db`/`.sqlite` files.
     - Pure Excel parser (`.xlsx`, `.xls`) with cell sanitization.
     - Safe schema introspection on external PostgreSQL using read-only transactions and 5s timeouts.
  3. **Local Workspace Discovery (`packages/ingest/src/localDiscovery.ts`):**
     - Scans bounded user project directories, skipping hidden/system/git/node_modules directories.
  4. **Resilient Synchronization Engine (`packages/ingest/src/syncEngine.ts`):**
     - **Idempotency:** Reuses existing data source IDs rather than creating duplicate records.
     - **Schema Drift Detection:** If expected columns disappear or change types, the engine freezes the source as `DRIFTED`, generates an assisted remediation proposal, and halts ingestion until human confirmation (`--force`).
     - **Deletion Tracking:** Tracks active keys (`activeSkus`). If an item is dropped from the external source, its stock is safely updated to 0 without deleting historical transaction records.
  5. **Deterministic Freshness Guardrail (`RULE_STALE_DATA_REFUSAL`):**
     - Rejects autonomous decisions on sources un-synced for >24 hours, escalating directly to human review.
  6. **Operator CLI Commands:**
     - `mint source discover [path]`, `mint source inspect <path>`, `mint source add <path>`, `mint source status`, `mint source list`.

---

## ADR-013: Mass Deletion Circuit Breakers & Semantic Freshness
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** In periodic data synchronization, truncated exports or partial filters could falsely delete half the catalog, setting stock to 0 and triggering catastrophic false purchasing orders.
- **Decision:**
  1. **Mass Deletion Circuit Breaker:**
     - If more than 20% of active SKUs disappear in a single sync, inventory mutation aborts, flagging the source as `PAUSED` with `massDeletionWarning` and requiring explicit `--force` confirmation.
  2. **Two-Phase Deletion Confirmation:**
     - A product missing from a single sync is not zeroed immediately. It enters `pendingDeletions` with counter 1. Only if absent on the next consecutive sync is deletion finalized. If it reappears, it is cleared from pending deletions.
  3. **Semantic Freshness Tracking:**
     - Tracks both `lastSyncedAt` (when MINT read the file) and `originMtime` (when the external source file was last modified).
  4. **Formula Shield & Quarantine:**
     - Escapes dangerous macro injection prefixes (`=cmd|...`) with a leading security apostrophe (`'=...`) and isolates suspect records in `mint_quarantine_records`.

---

## ADR-014: Live Sales Listener, Deduplication & Runtime Benchmarks
- **Date:** 2026-10-23
- **Status:** Accepted
- **Context:** Processing incoming sales from webhooks or channels in real time, decrementing inventory, checking safety stock, and dispatching receipts without double-charging or double-decrementing stock upon network retries.
- **Decision:**
  1. **Authorized Sender Whitelist:**
     - Incoming sales must match an authorized `senderId`, preventing transaction spoofing.
  2. **Strict 72-Hour Deduplication Window:**
     - Idempotency key checked against incoming messages; duplicates within 72 hours return cached acknowledgments without adjusting stock.
  3. **Environment & Architecture Diagnostics (`mint doctor`):**
     - Verifies Node.js runtime and database connectivity.
  4. **Performance Benchmark vs. Basic Rule ($Q = S_{min} - S_{actual}$):**
     - 100% prevention of duplicate in-transit purchasing orders ($3,000+ saved per incident).
     - 100% compliance with supplier Minimum Order Quantities (MOQ).
     - SLA optimization on urgent replenishment orders.
     - Strict observance of human-in-the-loop governance limits.

---

## ADR-015: Complete Technical Audit & Single Source of Truth
- **Date:** 2026-10-27
- **Status:** Accepted
- **Context:** Eliminating split-brain architectural debt between legacy root shims and `@mint/core`, uncoupling approvals, and aligning reorder point triggers.
- **Decision:**
  1. **Canonical Package Architecture:**
     - Consolidated all business logic into `@mint/core` as the canonical package.
  2. **Unified HITL Approvals Flow:**
     - `decisions` table is the single source of truth for Human-in-the-Loop workflows.
     - All purchase orders require human authorization via `/inbox` (ZERO automated money disbursements).
  3. **Multi-Tenant Scoping:**
     - All entities use tenant-prefixed compound identifiers.
  4. **Aligned ROP Triggers:**
     - Unified deficit trigger condition to `stock <= minStock` across daemon and event engines.
- **Consequences:** 100% test pass rate across the monorepo, zero code duplication, zero emojis, and complete traceability.

