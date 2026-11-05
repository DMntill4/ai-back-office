# MINT CLI & Autonomous AI Back Office — Technical Handoff Document

**Release Date:** October 29, 2026  
**Active Working Branch:** `developDiego`  
**Architecture Status:** Autonomous 24/7 Multi-Agent Coordination and Principle of Least Privilege (PoLP) Permissions Matrix fully implemented, tested, and verified. 30/30 test suites passing (179/179 tests), 0 TypeScript compiler errors (`tsc --noEmit`), 0 emojis across the codebase, and zero global admin concepts (all authorization strictly resides within each tenant database).

---

## 1. Executive Summary & Current State

MINT is an **Autonomous 24/7 Back Office and Multi-Agent Operations Coordinator** operated via terminal commands (`mint cli`), desktop visual control (`mint app`), and background daemons. It integrates with existing relational databases (PostgreSQL / Supabase / SQLite) without altering client schemas or hallucinating synthetic records.

### Core Architectural Principles
1. **CLI & Background Daemon First**: Automated background monitoring via `mint daemon start` and interactive terminal operations. Zero dependency on external web clouds.
2. **Specialized Multi-Agent Collaboration**: The Central Orchestrator (`mintOrchestrator`) delegates domain tasks to 7 specialist agents with typed contracts (`inventario`, `compras`, `logistica`, `notificaciones`, `datos_integraciones`, `auditoria`).
3. **Principle of Least Privilege (PoLP)**: No single agent possesses unbounded permissions. Zero automated disbursements, zero destructive deletions, and zero AI tampering with business policies.
4. **Tenant-Scoped Authorization (No "Global Admin")**: All roles (`owner`, `admin`, `supervisor`, `operator`, `auditor`, `finance`, `driver`, `viewer`) reside strictly within the `users` table bound to a `company_id`.
5. **Zero Emojis & Clean Logs**: All logs and outputs use standardized ASCII markers `[OK]`, `[ERROR]`, `[WARNING]`. Secrets and access tokens are masked before writing to audit logs.
6. **Multi-Tenant Isolation**: Every SQL query and permission check enforces strict tenant separation (`DENIED_CROSS_TENANT_VIOLATION`).

---

## 2. Multi-Agent Architecture Topology

```
                               ┌────────────────────────────────┐
                               │   Central MINT Orchestrator    │
                               │     (mintOrchestrator.ts)      │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────┬───────────────┼───────────────┬───────────────┐
               ▼               ▼               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │  Inventory  │ │ Purchasing  │ │  Logistics  │ │Notifications│ │    Data     │
        │    Agent    │ │    Agent    │ │    Agent    │ │    Agent    │ │ Integrations│
        └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Risk Audit  │
                                        │    Agent    │
                                        └─────────────┘
```

### Specialist Agent Responsibilities
1. **Orchestrator (`orchestrator`)**: Global situation analysis, cross-agent coordination, permission-gated delegation, and escalation to human supervisors (HITL). Does not mutate business tables directly.
2. **Inventory (`inventario`)**: Stockout detection, reorder point (ROP) calculation, replenishment recommendations, and authorized stock reconciliations.
3. **Purchasing (`compras`)**: Real supplier evaluation, MOQ analysis, lead time comparison, and draft purchase proposals. ZERO unilateral spending or automated fund disbursements.
4. **Logistics (`logistica`)**: OSRM road routing, shipment tracking, cargo consolidation, and transit delay detection.
5. **Notifications (`notificaciones`)**: Multi-channel structured alert dispatching (Telegram, Discord, Slack, Webhooks) with anti-spam rate limiting.
6. **Data & Integrations (`datos_integraciones`)**: Data freshness verification, schema drift detection, and catalog synchronization.
7. **Risk Audit (`auditoria`)**: Independent proposal scrutiny, risk scoring, duplicate detection, and append-only audit logging to `case_events` and Obsidian Vault.

---

## 3. Agent Permissions Matrix (Principle of Least Privilege)

Implemented in `packages/core/src/security/agentPermissionsMatrix.ts`:

| Agent | Read (`read`) | Analyze (`analyze`) | Propose (`propose`) | Request (`create_request`) | Execute (`execute`) | Update (`update`) | Notify (`notify`) | Approve (`approve`) | Configure (`configure_business`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Orchestrator** | Bounded scope | All | All | Purchases & cases | Coordination | No | Alerts | **FORBIDDEN** | **FORBIDDEN** |
| **Inventory** | Stock & sources | Inventory | Reorder levels | Stock request | Reconciliations | Permitted shifts | Critical stock alert | **FORBIDDEN** | **FORBIDDEN** |
| **Purchasing** | Suppliers & catalog | Suppliers | Purchase proposals | Restock request | Drafts (0 payments) | Purchase drafts | RFQ alerts | **FORBIDDEN** | **FORBIDDEN** |
| **Logistics** | Shipments & routes | Logistics | Rebalancing | Logistics request | Route updates | Shipment fields | Delay alerts | **FORBIDDEN** | **FORBIDDEN** |
| **Notifications** | Approved events | Messaging | Templates | No | Validated dispatch | No | Yes (valid channels) | **FORBIDDEN** | **FORBIDDEN** |
| **Data Integrations**| Sources & schemas | Data health | Proposed mappings | Sync task | Authorized ingest | Sync operations | Connection alerts | **FORBIDDEN** | **FORBIDDEN** |
| **Risk Audit** | Audits & orders | Risk & margins | Corrective measures | Audit task | System checks | No | Security alerts | **FORBIDDEN** | **FORBIDDEN** |
| **Human in DB** | Assigned tenant | Assigned tenant | All | All | By DB role | By DB role | Company channels | **YES (HITL)** | **YES (owner/admin)** |

### Immutable Enforcement Rules
- **Anti-Self-Approval**: No agent or user can approve an order or proposal that they created.
- **Zero AI Self-Approval**: The `approve` action is strictly reserved for authenticated human supervisors (`owner`, `admin`, `supervisor`).
- **Zero Destructive Deletions**: The `delete` action is strictly forbidden for all AI agents.
- **Orchestrator Privilege Escalation Prevention**: If the orchestrator attempts to assign a task outside an agent's matrix boundary, execution aborts with `DENIED_ORCHESTRATOR_ELEVATION_ATTEMPT`.
- **Tenant Boundary Enforcement**: Any cross-tenant data access is rejected at runtime with `DENIED_CROSS_TENANT_VIOLATION`.

---

## 4. Tenant Database Roles

All roles are defined in `packages/core/src/db/schema/users.ts` and managed per company:

1. **`owner`**: Full operational control: business thresholds, SQL ingestion, user invitations, and final purchasing authorization.
2. **`admin`**: Company operations manager. Manages HITL approvals, dispatches, receiving, team members, and channels.
3. **`supervisor`**: Operational supervisor. Reviews and approves inventory actions, routing, and operator dispatches.
4. **`operator`**: Logistics and warehouse operator. Handles order dispatch, inventory receipt, and daily stock queries.
5. **`driver`**: Delivery carrier. Accesses assigned vehicle routes and confirms shipment deliveries.
6. **`auditor`**: Compliance auditor. Reviews approval logs, risk reports, and immutable audit trails.
7. **`finance`**: Treasury specialist. Receives approved purchase orders to execute external payments.
8. **`viewer`**: Read-only auditor. Reviews dashboards and reports with zero mutation privileges.

---

## 5. Automated Test Suite Results

Test execution summary via `vitest`:

```text
Test Files  30 passed (30)
     Tests  179 passed (179)
  Duration  85.16s
```

### Key Verified Suites:
1. `tests/agent_permissions_matrix.test.ts` (10 tests, 100% pass):
   - Role-based authorization matrix.
   - Rejection of unauthorized actions and agent business configuration.
   - Orchestrator privilege escalation blocking.
   - Prohibition of AI self-approval.
   - Multi-tenant data partition enforcement.
   - Prompt injection resistance with simulated bypass attacks.
   - Credential leakage prevention in audit logs.
2. `tests/autonomous_multiagent_architecture.test.ts` (7 tests, 100% pass).
3. `tests/adversarial_security_and_guardrails.test.ts` (5 tests, 100% pass).
4. `tests/daemon_watcher.test.ts` (3 tests, 100% pass).
5. `tests/sales_channel_execution.test.ts` (4 tests, 100% pass).

---

## 6. Verification Commands

```bash
# 1. Strict TypeScript check (0 errors)
npm run typecheck

# 2. Zero-Emoji Compliance Check (0 detected)
npm run lint:emojis

# 3. Agent Permissions Matrix Suite
npx vitest run tests/agent_permissions_matrix.test.ts

# 4. Run S2 10 Real Executions Benchmark
mint executions

# 5. Start CLI Interactive Console
mint cli
```

