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

      -- Tablas propias de MINT (Prefijo reservado mint_*)
      CREATE TABLE IF NOT EXISTS mint_table_mappings (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_table VARCHAR(128) NOT NULL,
        target_entity VARCHAR(64) NOT NULL,
        column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        is_read_only BOOLEAN NOT NULL DEFAULT TRUE,
        write_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mint_pending_questions (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        topic VARCHAR(64) NOT NULL,
        question TEXT NOT NULL,
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        answer TEXT,
        answered_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        answered_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS mint_route_incidents (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        shipment_id VARCHAR(128),
        tracking_number VARCHAR(100) NOT NULL,
        incident_type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
        current_location TEXT,
        delay_minutes INTEGER NOT NULL DEFAULT 0,
        previous_route JSONB NOT NULL DEFAULT '{}'::jsonb,
        proposed_route JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'proposed',
        approved_by VARCHAR(100),
        notified_parties JSONB NOT NULL DEFAULT '[]'::jsonb,
        reason TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS mint_sales_orders (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        external_order_id VARCHAR(128),
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        shipping_address TEXT NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        channel VARCHAR(64) NOT NULL DEFAULT 'web',
        payment_status VARCHAR(32) NOT NULL DEFAULT 'paid',
        shipping_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        idempotency_key VARCHAR(255) UNIQUE,
        signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
        items_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      -- Columnas de auditoría y aprobación estricta en decisions
      ALTER TABLE decisions ADD COLUMN IF NOT EXISTS requester_user_id VARCHAR(100);
      ALTER TABLE decisions ADD COLUMN IF NOT EXISTS supervisor_notified BOOLEAN DEFAULT FALSE;
      ALTER TABLE decisions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

      -- Tablas adicionales de calidad, cuarentena, agregación y modo sombra (Segunda Pasada)
      CREATE TABLE IF NOT EXISTS mint_quarantine_records (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        entity_type VARCHAR(64) NOT NULL,
        source_table VARCHAR(128) NOT NULL,
        record_identifier VARCHAR(128),
        violation_type VARCHAR(64) NOT NULL,
        reason TEXT NOT NULL,
        severity VARCHAR(16) NOT NULL DEFAULT 'ERROR',
        raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'quarantined',
        reviewed_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS mint_shadow_decisions (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        action_type VARCHAR(64) NOT NULL,
        proposing_agent VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        simulated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        predicted_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
        actual_outcome JSONB,
        shadow_status VARCHAR(32) NOT NULL DEFAULT 'simulated',
        comparison_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        evaluated_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS mint_materialized_aggregations (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        aggregation_key VARCHAR(128) NOT NULL,
        metrics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        record_count INTEGER NOT NULL DEFAULT 0,
        computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mint_quality_scores (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        module VARCHAR(64) NOT NULL,
        confidence_level VARCHAR(32) NOT NULL,
        score_percent INTEGER NOT NULL,
        total_records_audited INTEGER NOT NULL DEFAULT 0,
        corrupt_records_count INTEGER NOT NULL DEFAULT 0,
        reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
        sample_corrupt_records JSONB NOT NULL DEFAULT '[]'::jsonb,
        evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_quarantine_company ON mint_quarantine_records(company_id, status);
      CREATE INDEX IF NOT EXISTS idx_shadow_company ON mint_shadow_decisions(company_id, shadow_status);
      CREATE INDEX IF NOT EXISTS idx_quality_company ON mint_quality_scores(company_id, module);
      CREATE INDEX IF NOT EXISTS idx_mat_agg_key ON mint_materialized_aggregations(company_id, aggregation_key);

      -- Columnas físicas, fiscales y bancarias para Proveedores
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS street_address TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
      ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_clabe VARCHAR(30);

      -- Estado de pago en Órdenes de Compra
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'pendiente_pago';

      -- Columnas de precio y costo directo en Productos
      ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
    `);
    console.log("[OK] Tablas e infraestructura física/geográfica verificadas en PostgreSQL.");
  } catch (err) {
    console.warn("[AVISO] Aviso al asegurar tablas de decisiones:", (err as Error).message);
  } finally {
    client.release();
  }
}
