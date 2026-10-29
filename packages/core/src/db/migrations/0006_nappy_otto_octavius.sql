CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"case_id" text NOT NULL,
	"action_type" varchar(64) NOT NULL,
	"proposing_agent" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"cost_mxn" numeric(12, 2) DEFAULT '0' NOT NULL,
	"risk_score" numeric(4, 3) DEFAULT '0' NOT NULL,
	"reversible" boolean DEFAULT false NOT NULL,
	"evidence_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"policy_decision" text DEFAULT 'pending_approval' NOT NULL,
	"policy_reason" text,
	"approved_by" varchar(100),
	"feedback" text,
	"decided_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"execution_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_events" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'MEDIUM' NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"case_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "policy_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"rule_type" varchar(64) NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action" varchar(32) DEFAULT 'REQUIRE_APPROVAL' NOT NULL,
	"learned_from_decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"name" text NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"uri_or_path" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"data_source_id" text,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"target_entity" varchar(64) NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors_payload" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"name" text NOT NULL,
	"target_entity" varchar(64) NOT NULL,
	"mappings" jsonb NOT NULL,
	"sample_headers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"type" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" varchar(8),
	"quiet_hours_end" varchar(8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"channel_id" text,
	"decision_id" text,
	"severity" varchar(16) DEFAULT 'INFO' NOT NULL,
	"status" varchar(32) DEFAULT 'SENT' NOT NULL,
	"message_id" varchar(128),
	"signed_token" varchar(256),
	"token_expires_at" timestamp with time zone,
	"is_used" boolean DEFAULT false NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "rfc_tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "currency" varchar(10) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "street_address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "latitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "longitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tax_id" varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "street_address" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "country" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "latitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "longitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "street_address" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "country" varchar(50);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "latitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "longitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE set null ON UPDATE no action;