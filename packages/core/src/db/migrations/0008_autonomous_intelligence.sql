CREATE TABLE IF NOT EXISTS "fleet_vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"plate_number" varchar(32) NOT NULL,
	"vehicle_type" text DEFAULT 'box_truck' NOT NULL,
	"max_weight_kg" numeric(10, 2) DEFAULT '3500.00' NOT NULL,
	"max_volume_m3" numeric(10, 2) DEFAULT '18.00' NOT NULL,
	"assigned_driver_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"current_latitude" text,
	"current_longitude" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "vehicle_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "driver_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "origin_warehouse_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "destination_address" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "destination_latitude" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "destination_longitude" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "cargo_manifest" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "total_weight_kg" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "capacity_utilization_pct" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "freight_cost_mxn" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "bank_name" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "bank_clabe" varchar(30);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pendiente_pago' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "case_id" text;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "requester_user_id" varchar(100);--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "supervisor_notified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_table_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"source_table" varchar(128) NOT NULL,
	"target_entity" varchar(64) NOT NULL,
	"column_mappings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"is_read_only" boolean DEFAULT true NOT NULL,
	"write_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_pending_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"topic" varchar(64) NOT NULL,
	"question" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"answer" text,
	"answered_by" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_route_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"shipment_id" text,
	"tracking_number" varchar(100) NOT NULL,
	"incident_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'MEDIUM' NOT NULL,
	"current_location" text,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"previous_route" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_route" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'proposed' NOT NULL,
	"approved_by" varchar(100),
	"notified_parties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"external_order_id" varchar(128),
	"customer_name" text NOT NULL,
	"customer_email" text,
	"shipping_address" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"channel" varchar(64) DEFAULT 'web' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'paid' NOT NULL,
	"shipping_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(255),
	"signature_verified" boolean DEFAULT false NOT NULL,
	"items_payload" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_quarantine_records" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"entity_type" varchar(64) NOT NULL,
	"source_table" varchar(128) NOT NULL,
	"record_identifier" varchar(128),
	"violation_type" varchar(64) NOT NULL,
	"reason" text NOT NULL,
	"severity" varchar(16) DEFAULT 'ERROR' NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'quarantined' NOT NULL,
	"reviewed_by" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_shadow_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"action_type" varchar(64) NOT NULL,
	"proposing_agent" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"simulated_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"evidence_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"predicted_outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actual_outcome" jsonb,
	"shadow_status" varchar(32) DEFAULT 'simulated' NOT NULL,
	"comparison_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_materialized_aggregations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"aggregation_key" varchar(128) NOT NULL,
	"metrics_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mint_quality_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"module" varchar(64) NOT NULL,
	"confidence_level" varchar(32) NOT NULL,
	"score_percent" integer NOT NULL,
	"total_records_audited" integer DEFAULT 0 NOT NULL,
	"corrupt_records_count" integer DEFAULT 0 NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sample_corrupt_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"product_id" text NOT NULL REFERENCES "products"("id") ON DELETE cascade,
	"warehouse_id" text NOT NULL REFERENCES "warehouses"("id") ON DELETE cascade,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"quantity_delta" integer NOT NULL,
	"movement_type" text DEFAULT 'AJUSTE_AUDITORIA' NOT NULL,
	"reason" text,
	"authorized_by" text DEFAULT 'SISTEMA' NOT NULL,
	"transaction_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_operational_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"category" text DEFAULT 'CONTEXTO_OPERATIVO' NOT NULL,
	"subject_key" text NOT NULL,
	"content" text NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"author" text DEFAULT 'ADMIN' NOT NULL,
	"supersedes_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"incident_type" text DEFAULT 'VIOLACION_RBAC' NOT NULL,
	"severity" text DEFAULT 'ALTA' NOT NULL,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'DETECTADO' NOT NULL,
	"detected_by" text DEFAULT 'MINT_AUTONOMOUS_PATROL' NOT NULL,
	"resolved_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_task_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
	"task_type" text NOT NULL,
	"objective" text NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"source_target" text,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failed_attempts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"initiated_by" text DEFAULT 'AUTONOMOUS_AGENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
