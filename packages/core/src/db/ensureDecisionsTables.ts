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

      CREATE TABLE IF NOT EXISTS data_sources (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        uri_or_path TEXT NOT NULL,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS import_jobs (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        data_source_id VARCHAR(64) REFERENCES data_sources(id) ON DELETE SET NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        target_entity VARCHAR(64) NOT NULL,
        total_rows INTEGER NOT NULL DEFAULT 0,
        imported_rows INTEGER NOT NULL DEFAULT 0,
        failed_rows INTEGER NOT NULL DEFAULT 0,
        column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
        errors_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS import_templates (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_entity VARCHAR(64) NOT NULL,
        mappings JSONB NOT NULL,
        sample_headers JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_channels (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        type VARCHAR(32) NOT NULL,
        name TEXT NOT NULL,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        quiet_hours_start VARCHAR(8),
        quiet_hours_end VARCHAR(8),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_log (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL DEFAULT 'comp_default' REFERENCES companies(id) ON DELETE CASCADE,
        channel_id VARCHAR(64) REFERENCES notification_channels(id) ON DELETE SET NULL,
        decision_id VARCHAR(64) REFERENCES decisions(id) ON DELETE SET NULL,
        severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
        status VARCHAR(32) NOT NULL DEFAULT 'SENT',
        message_id VARCHAR(128),
        signed_token VARCHAR(256),
        token_expires_at TIMESTAMP WITH TIME ZONE,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_company_status ON decisions(company_id, policy_decision);
      CREATE INDEX IF NOT EXISTS idx_operational_events_company_status ON operational_events(company_id, status);
      CREATE INDEX IF NOT EXISTS idx_data_sources_company ON data_sources(company_id);
      CREATE INDEX IF NOT EXISTS idx_notif_channels_company ON notification_channels(company_id);
      CREATE INDEX IF NOT EXISTS idx_notif_log_token ON notification_log(signed_token);

      -- Columnas físicas y fiscales globales para Empresas
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS rfc_tax_id VARCHAR(50);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS street_address TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(50);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);

      -- Columnas físicas y geográficas para Almacenes
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS street_address TEXT;
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS country VARCHAR(50);
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
      ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

      -- Columnas físicas y fiscales para Proveedores
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS street_address TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
    `);
    console.log("✅ Tablas e infraestructura física/geográfica verificadas en PostgreSQL.");
  } catch (err) {
    console.warn("⚠️ Aviso al asegurar tablas de decisiones:", (err as Error).message);
  } finally {
    client.release();
  }
}
