import { describe, expect, it } from "vitest";
import { hydrateChatSession } from "@/utils/chatSession";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("hydrateChatSession", () => {
  it("keeps Twitch after the URL tokens are stripped when Kick remains", () => {
    const storage = memoryStorage();
    const first = hydrateChatSession(
      "twitchChannel=alice&twitchToken=secret&kickChannel=bob",
      storage,
    );

    expect(first.twitch?.channel).toBe("alice");
    expect(first.kickChannel).toBe("bob");

    const afterScrub = hydrateChatSession(
      "twitchChannel=alice&kickChannel=bob",
      storage,
    );
    expect(afterScrub.twitch?.channel).toBe("alice");
    expect(afterScrub.twitch?.token).toBe("secret");
    expect(afterScrub.kickChannel).toBe("bob");
  });

  it("hydrates Twitch from localStorage when the widget URL has no secrets", () => {
    const storage = memoryStorage({
      twitchToken: "stored",
      twitchChannelInfo: JSON.stringify({ username: "alice", id: "1" }),
    });

    const session = hydrateChatSession("kickChannel=bob", storage);
    expect(session.twitch).toEqual({
      channel: "alice",
      token: "stored",
      broadcasterId: "1",
      clientId: "",
    });
    expect(session.kickChannel).toBe("bob");
  });
});
