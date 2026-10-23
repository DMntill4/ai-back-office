import { pool } from "./client";

export async function ensureDecisionsTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS operational_events (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        case_id VARCHAR(64) REFERENCES cases(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        action_type VARCHAR(64) NOT NULL,
        proposing_agent VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        cost_mxn NUMERIC(12, 2) NOT NULL DEFAULT 0,
        risk_score NUMERIC(4, 3) NOT NULL DEFAULT 0,
        reversible BOOLEAN NOT NULL DEFAULT FALSE,
        evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        risk_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        policy_decision VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
        policy_reason TEXT,
        approved_by VARCHAR(100),
        feedback TEXT,
        decided_at TIMESTAMP WITH TIME ZONE,
        executed_at TIMESTAMP WITH TIME ZONE,
        verified_at TIMESTAMP WITH TIME ZONE,
        execution_result JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS policy_rules (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        rule_type VARCHAR(64) NOT NULL,
        conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
        action VARCHAR(32) NOT NULL DEFAULT 'REQUIRE_APPROVAL',
        learned_from_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_company_status ON decisions(company_id, policy_decision);
      CREATE INDEX IF NOT EXISTS idx_operational_events_company_status ON operational_events(company_id, status);
    `);
    console.log("✅ Tablas de decisiones, eventos y reglas operativas verificadas en PostgreSQL.");
  } catch (err) {
    console.warn("⚠️ Aviso al asegurar tablas de decisiones:", (err as Error).message);
  } finally {
    client.release();
  }
}
