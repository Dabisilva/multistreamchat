import { describe, expect, it } from "vitest";
import {
  YOUTUBE_DATA_MAX_AGE_MS,
  YOUTUBE_STORAGE_KEYS,
  clearYoutubeApiData,
  clearYoutubeSession,
  getYoutubeAccessToken,
  getYoutubeChannelId,
  getYoutubeChannelInfo,
  getYoutubeUserInfo,
  setYoutubeAccessToken,
  setYoutubeUserInfo,
} from "@/utils/youtubeStorage";
import type { UserInfo } from "@/services/OAuthService";

function memoryStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

const profile: UserInfo = {
  id: "UC123",
  username: "channel",
  displayName: "Channel",
  avatar: "https://example.invalid/a.jpg",
  platform: "youtube",
  broadcasterId: "UC123",
};

describe("youtubeStorage", () => {
  it("uses a fresh cached profile", () => {
    const store = memoryStore();
    const now = 1_000_000;
    setYoutubeUserInfo(profile, store, now);

    expect(getYoutubeUserInfo(store, now + 1000)).toEqual(profile);
    expect(getYoutubeChannelId(store, now + 1000)).toBe("UC123");
    expect(getYoutubeChannelInfo(store, now + 1000)?.id).toBe("UC123");
  });

  it("does not use an expired cached profile", () => {
    const store = memoryStore();
    const now = 1_000_000;
    setYoutubeUserInfo(profile, store, now);

    expect(
      getYoutubeUserInfo(store, now + YOUTUBE_DATA_MAX_AGE_MS),
    ).toBeNull();
    expect(store.snapshot()[YOUTUBE_STORAGE_KEYS.userInfo]).toBeUndefined();
  });

  it("treats untimestamped legacy cache as expired and removes it", () => {
    const store = memoryStore({
      [YOUTUBE_STORAGE_KEYS.userInfo]: JSON.stringify(profile),
      [YOUTUBE_STORAGE_KEYS.channelId]: "UC123",
    });

    expect(getYoutubeUserInfo(store, Date.now())).toBeNull();
    expect(store.snapshot()[YOUTUBE_STORAGE_KEYS.userInfo]).toBeUndefined();
  });

  it("handles corrupted cached profile without throwing", () => {
    const store = memoryStore({
      [YOUTUBE_STORAGE_KEYS.userInfo]: "{not-json",
    });

    expect(getYoutubeUserInfo(store)).toBeNull();
  });

  it("clears cached YouTube profile data on sign-out", () => {
    const store = memoryStore();
    setYoutubeUserInfo(profile, store);
    setYoutubeAccessToken("access-token", store);

    clearYoutubeSession(store);

    expect(getYoutubeUserInfo(store)).toBeNull();
    expect(getYoutubeAccessToken(store)).toBe("");
    expect(getYoutubeChannelId(store)).toBe("");
    expect(store.snapshot()[YOUTUBE_STORAGE_KEYS.refreshToken]).toBeUndefined();
  });

  it("can clear API data without being used as a credential wipe helper from callers that only want cache", () => {
    const store = memoryStore();
    setYoutubeUserInfo(profile, store);
    setYoutubeAccessToken("access-token", store);

    clearYoutubeApiData(store);

    expect(getYoutubeUserInfo(store)).toBeNull();
    expect(getYoutubeAccessToken(store)).toBe("access-token");
  });
});
