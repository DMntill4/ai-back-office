import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./business";
import { decisions } from "./decisions";

// 1. Canales de Notificación (Telegram, Slack, Gmail)
export const notificationChannels = pgTable("notification_channels", {
  id: text("id").primaryKey(), // ej: 'notif_tg_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  type: varchar("type", { length: 32 }).notNull(), // 'telegram', 'slack', 'gmail'
  name: text("name").notNull(),
  config: jsonb("config").notNull().default({}), // tokens, chat_id, webhook_url, smtp_settings
  isActive: boolean("is_active").notNull().default(true),
  quietHoursStart: varchar("quiet_hours_start", { length: 8 }), // '22:00'
  quietHoursEnd: varchar("quiet_hours_end", { length: 8 }), // '07:00'
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. Bitácora de Notificaciones y Tokens de Aprobación Remota
export const notificationLog = pgTable("notification_log", {
  id: text("id").primaryKey(), // ej: 'nlog_001'
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .default("comp_default"),
  channelId: text("channel_id").references(() => notificationChannels.id, { onDelete: "set null" }),
  decisionId: text("decision_id").references(() => decisions.id, { onDelete: "set null" }),
  severity: varchar("severity", { length: 16 }).notNull().default("INFO"), // 'INFO', 'WARNING', 'CRITICAL'
  status: varchar("status", { length: 32 }).notNull().default("SENT"), // 'SENT', 'DELIVERED', 'FAILED', 'APPROVED', 'REJECTED'
  messageId: varchar("message_id", { length: 128 }),
  signedToken: varchar("signed_token", { length: 256 }),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  isUsed: boolean("is_used").notNull().default(false),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
