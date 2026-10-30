ALTER TABLE "cases" ADD COLUMN "prompt_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "completion_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "model_used" varchar(100);
