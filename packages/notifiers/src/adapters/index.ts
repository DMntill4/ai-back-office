import { TelegramAdapter } from "./telegramAdapter";
import { SlackAdapter } from "./slackAdapter";
import { GmailAdapter } from "./gmailAdapter";
import { DiscordAdapter } from "./discordAdapter";
import { type ChannelType, type NotifierAdapter } from "../types";

export * from "./telegramAdapter";
export * from "./slackAdapter";
export * from "./gmailAdapter";
export * from "./discordAdapter";

export const adapters: Record<ChannelType, NotifierAdapter> = {
  telegram: new TelegramAdapter(),
  slack: new SlackAdapter(),
  gmail: new GmailAdapter(),
  discord: new DiscordAdapter(),
};
