import { describe, expect, it } from "vitest";
import { deduplicateNotificationChannels } from "../packages/notifiers/src/channelManager";

describe("deduplicateNotificationChannels", () => {
  it("colapsa configuraciones idénticas y conserva la activa más reciente", () => {
    const channels = [
      {
        id: "old",
        type: "telegram",
        config: { botToken: "token-a", chatId: "chat-a" },
        isActive: false,
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "new",
        type: "telegram",
        config: { botToken: "token-a", chatId: "chat-a" },
        isActive: true,
        createdAt: new Date("2026-01-02"),
      },
      {
        id: "other-chat",
        type: "telegram",
        config: { botToken: "token-a", chatId: "chat-b" },
        isActive: true,
        createdAt: new Date("2026-01-03"),
      },
    ];

    expect(deduplicateNotificationChannels(channels).map(({ id }) => id)).toEqual([
      "new",
      "other-chat",
    ]);
  });
});
