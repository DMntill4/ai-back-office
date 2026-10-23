CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "companies" ("id", "name", "slug") 
VALUES ('comp_default', 'Acme Industrial Corp', 'acme-industrial') 
ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TABLE "sales_history" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"product_id" text NOT NULL,
	"sale_date" timestamp with time zone NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"channel" text DEFAULT 'directo',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text DEFAULT 'comp_default' NOT NULL,
	"purchase_order_id" text,
	"tracking_number" varchar(100) NOT NULL,
	"carrier" text NOT NULL,
	"status" text DEFAULT 'en_transito' NOT NULL,
	"estimated_delivery" timestamp with time zone NOT NULL,
	"actual_delivery" timestamp with time zone,
	"origin_location" text,
	"current_location" text,
	"destination_location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_sku_unique";--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_config" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_config" ADD COLUMN "currency" varchar(10) DEFAULT 'MXN' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "company_id" text DEFAULT 'comp_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_config" DROP CONSTRAINT IF EXISTS "business_config_pkey";--> statement-breakpoint
ALTER TABLE "business_config" ADD CONSTRAINT "business_config_company_id_key_pk" PRIMARY KEY("company_id","key");--> statement-breakpoint
ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_config" ADD CONSTRAINT "business_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_sku_unique" UNIQUE("company_id","sku");--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "supplier_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "llm_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tool_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approvals" ENABLE ROW LEVEL SECURITY;