import { describe, expect, it } from "vitest";
import {
  nextYoutubeChatPollMs,
  youtubeModerationFromItem,
} from "@/services/YoutubeChat";

describe("nextYoutubeChatPollMs", () => {
  it("uses 15s when chat is active even if YouTube asks for 5s", () => {
    expect(nextYoutubeChatPollMs(5000, 0)).toBe(15_000);
  });

  it("backs off to 20s after an empty poll", () => {
    expect(nextYoutubeChatPollMs(5000, 1)).toBe(20_000);
    expect(nextYoutubeChatPollMs(5000, 4)).toBe(20_000);
  });

  it("never polls faster than YouTube's pollingIntervalMillis", () => {
    expect(nextYoutubeChatPollMs(18_000, 0)).toBe(18_000);
    expect(nextYoutubeChatPollMs(25_000, 1)).toBe(25_000);
  });
});

describe("youtubeModerationFromItem", () => {
  it("reads a moderator message deletion", () => {
    expect(
      youtubeModerationFromItem({
        id: "event-1",
        snippet: {
          type: "messageDeletedEvent",
          messageDeletedDetails: { deletedMessageId: "msg-9" },
        },
      }),
    ).toEqual({ type: "delete", messageId: "msg-9" });
  });

  it("reads a hidden or banned user by channel id and display name", () => {
    expect(
      youtubeModerationFromItem({
        id: "event-2",
        snippet: {
          type: "userBannedEvent",
          userBannedDetails: {
            bannedUserDetails: {
              channelId: "UChidden",
              displayName: "@HiddenUser",
            },
            banType: "temporary",
          },
        },
      }),
    ).toEqual({ type: "ban", username: "HiddenUser", userId: "UChidden" });
  });

  it("ignores ordinary chat messages", () => {
    expect(
      youtubeModerationFromItem({
        id: "msg-1",
        snippet: { type: "textMessageEvent", displayMessage: "oi" },
      }),
    ).toBeNull();
  });
});
