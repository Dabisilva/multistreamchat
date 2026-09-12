import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/types";
import {
  appendBounded,
  excludeProvider,
  getMessageKey,
  hasPrivilegedBadge,
  MessageIdSet,
  messageMatchesUser,
} from "@/utils/chatLogic";

function message(partial: Partial<ChatMessage> & Pick<ChatMessage, "id">): ChatMessage {
  return {
    userId: "1",
    username: "alice",
    displayName: "Alice",
    displayColor: "#fff",
    text: "hi",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: 1,
    provider: "twitch",
    channel: "chan",
    msgId: partial.id,
    ...partial,
  };
}

describe("chatLogic", () => {
  it("caps the message list at the data boundary", () => {
    const limited = ["a", "b", "c", "d"].reduce(
      (acc, item) => appendBounded(acc, item, 3),
      [] as string[],
    );
    expect(limited).toEqual(["b", "c", "d"]);
  });

  it("prefixes message keys with provider for channel isolation", () => {
    expect(getMessageKey(message({ id: "abc", msgId: "abc", provider: "kick" }))).toBe(
      "kick:abc",
    );
  });

  it("treats privileged badges as delay bypass", () => {
    expect(hasPrivilegedBadge([{ type: "moderator", version: "1", url: "", description: "" }])).toBe(
      true,
    );
    expect(hasPrivilegedBadge([{ type: "subscriber", version: "1", url: "", description: "" }])).toBe(
      false,
    );
  });

  it("matches bans against login even when display name differs", () => {
    const msg = message({
      id: "1",
      username: "nightbot",
      displayName: "NightBot",
    });
    expect(messageMatchesUser(msg, "nightbot")).toBe(true);
    expect(messageMatchesUser(msg, "NightBot")).toBe(true);
    expect(messageMatchesUser(msg, "other")).toBe(false);
  });

  it("drops only the switched platform on channel change", () => {
    const messages = [
      message({ id: "t1", provider: "twitch" }),
      message({ id: "k1", provider: "kick" }),
    ];
    expect(excludeProvider(messages, "twitch").map((item) => item.id)).toEqual(["k1"]);
  });

  it("prevents duplicate ids and stays bounded", () => {
    const ids = new MessageIdSet(4, 2);
    ids.add("twitch:1");
    ids.add("twitch:2");
    ids.add("twitch:3");
    ids.add("twitch:4");
    expect(ids.has("twitch:1")).toBe(true);
    ids.add("twitch:5");
    expect(ids.size).toBe(2);
    expect(ids.has("twitch:1")).toBe(false);
    ids.deleteByPrefix("twitch:");
    expect(ids.size).toBe(0);
  });
});
