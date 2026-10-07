import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .url({
      message:
        "DATABASE_URL debe ser una URL válida (ej. postgresql://user:pass@localhost:5432/dbname)",
    })
    .default("postgresql://postgres:postgres@localhost:5432/ai_back_office"),
  RETO_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  GROK_BASE_URL: z.string().url().default("https://api.reto.pltk.mx/v1"),
  GROK_MODEL: z.string().default("grok-4.6"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Environment variables validation error:");
  console.error(JSON.stringify(_env.error.format(), null, 2));
  throw new Error("Invalid environment configuration");
}

export const env = _env.data;
