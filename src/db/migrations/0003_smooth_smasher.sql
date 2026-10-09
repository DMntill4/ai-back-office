ALTER TABLE "inventory" ADD COLUMN "expiration_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "sales_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text DEFAULT 'general';