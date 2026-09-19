import type { UserInfo } from "@/services/OAuthService";
import { resetYoutubeLiveGate } from "@/services/youtubeLive";

/** Conservative retention window below YouTube's 30-day API data limit. */
export const YOUTUBE_DATA_MAX_AGE_MS = 25 * 24 * 60 * 60 * 1000;

export const YOUTUBE_STORAGE_KEYS = {
  userInfo: "youtubeUserInfo",
  channelInfo: "youtubeChannelInfo",
  channelId: "youtubeChannelId",
  token: "youtubeToken",
  refreshToken: "youtubeRefreshToken",
  expiresAt: "youtubeTokenExpiresAt",
  oauthState: "youtube_oauth_state",
  codeVerifier: "youtube_code_verifier",
  liveSession: "youtubeLiveSession",
} as const;

export type YoutubeStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type YoutubeChannelInfo = {
  username?: string;
  displayName?: string;
  id?: string;
  platform: "youtube";
};

type Cached<T> = {
  data: T;
  fetchedAt: number;
};

const API_DATA_KEYS = [
  YOUTUBE_STORAGE_KEYS.userInfo,
  YOUTUBE_STORAGE_KEYS.channelInfo,
  YOUTUBE_STORAGE_KEYS.channelId,
] as const;

const SESSION_KEYS = [
  ...API_DATA_KEYS,
  YOUTUBE_STORAGE_KEYS.token,
  YOUTUBE_STORAGE_KEYS.refreshToken,
  YOUTUBE_STORAGE_KEYS.expiresAt,
  YOUTUBE_STORAGE_KEYS.oauthState,
  YOUTUBE_STORAGE_KEYS.codeVerifier,
  YOUTUBE_STORAGE_KEYS.liveSession,
] as const;

function browserStorage(): YoutubeStore | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function browserSessionStorage(): YoutubeStore | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function resolveStore(storage?: YoutubeStore | null): YoutubeStore | null {
  if (storage) return storage;
  return browserStorage();
}

function read(store: YoutubeStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function write(store: YoutubeStore, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // private mode / quota
  }
}

function remove(store: YoutubeStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}

function isFresh(fetchedAt: number, now: number): boolean {
  return (
    Number.isFinite(fetchedAt) &&
    fetchedAt > 0 &&
    now - fetchedAt >= 0 &&
    now - fetchedAt < YOUTUBE_DATA_MAX_AGE_MS
  );
}

function parseCached<T>(
  raw: string | null,
  isData: (value: unknown) => value is T,
): Cached<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "fetchedAt" in parsed
    ) {
      const cached = parsed as Cached<unknown>;
      if (!isData(cached.data)) return null;
      if (typeof cached.fetchedAt !== "number") return null;
      return { data: cached.data, fetchedAt: cached.fetchedAt };
    }
    // Legacy untimestamped payloads are treated as expired.
    return null;
  } catch {
    return null;
  }
}

function isUserInfo(value: unknown): value is UserInfo {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.username === "string" &&
    typeof record.displayName === "string" &&
    record.platform === "youtube"
  );
}

function isChannelInfo(value: unknown): value is YoutubeChannelInfo {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.platform === "youtube";
}

function readFreshCached<T>(
  store: YoutubeStore,
  key: string,
  isData: (value: unknown) => value is T,
  now: number,
): T | null {
  const cached = parseCached(read(store, key), isData);
  if (!cached) {
    return null;
  }
  if (!isFresh(cached.fetchedAt, now)) {
    return null;
  }
  return cached.data;
}

function writeCached<T>(store: YoutubeStore, key: string, data: T, now: number): void {
  write(store, key, JSON.stringify({ data, fetchedAt: now } satisfies Cached<T>));
}

export function getYoutubeUserInfo(
  storage?: YoutubeStore | null,
  now = Date.now(),
): UserInfo | null {
  const store = resolveStore(storage);
  if (!store) return null;
  const data = readFreshCached(store, YOUTUBE_STORAGE_KEYS.userInfo, isUserInfo, now);
  if (data) return data;
  const raw = read(store, YOUTUBE_STORAGE_KEYS.userInfo);
  if (raw) clearYoutubeApiData(store);
  return null;
}

export function setYoutubeUserInfo(
  userData: UserInfo,
  storage?: YoutubeStore | null,
  now = Date.now(),
): void {
  const store = resolveStore(storage);
  if (!store) return;

  writeCached(store, YOUTUBE_STORAGE_KEYS.userInfo, userData, now);

  if (userData.id && userData.id !== "youtube") {
    write(store, YOUTUBE_STORAGE_KEYS.channelId, userData.id);
  }

  writeCached(
    store,
    YOUTUBE_STORAGE_KEYS.channelInfo,
    {
      username: userData.username,
      displayName: userData.displayName,
      id: userData.id,
      platform: "youtube" as const,
    },
    now,
  );
}

export function getYoutubeChannelInfo(
  storage?: YoutubeStore | null,
  now = Date.now(),
): YoutubeChannelInfo | null {
  const store = resolveStore(storage);
  if (!store) return null;
  const data = readFreshCached(
    store,
    YOUTUBE_STORAGE_KEYS.channelInfo,
    isChannelInfo,
    now,
  );
  if (data) return data;
  const raw = read(store, YOUTUBE_STORAGE_KEYS.channelInfo);
  if (raw) clearYoutubeApiData(store);
  return null;
}

export function setYoutubeChannelInfo(
  info: YoutubeChannelInfo,
  storage?: YoutubeStore | null,
  now = Date.now(),
): void {
  const store = resolveStore(storage);
  if (!store) return;
  writeCached(store, YOUTUBE_STORAGE_KEYS.channelInfo, { ...info, platform: "youtube" }, now);
  if (info.id && info.id !== "youtube") {
    write(store, YOUTUBE_STORAGE_KEYS.channelId, info.id);
  }
}

export function getYoutubeChannelId(
  storage?: YoutubeStore | null,
  now = Date.now(),
): string {
  const store = resolveStore(storage);
  if (!store) return "";
  const user = getYoutubeUserInfo(store, now);
  const channel = getYoutubeChannelInfo(store, now);
  const id = user?.id || user?.broadcasterId || channel?.id || "";
  if (id && id !== "youtube") return id;

  const rawId = read(store, YOUTUBE_STORAGE_KEYS.channelId);
  if (!rawId || rawId === "youtube") return "";

  if (!getYoutubeAccessToken(store)) {
    remove(store, YOUTUBE_STORAGE_KEYS.channelId);
    return "";
  }

  return rawId;
}

export function setYoutubeChannelId(
  channelId: string,
  storage?: YoutubeStore | null,
): void {
  const store = resolveStore(storage);
  if (!store || !channelId || channelId === "youtube") return;
  write(store, YOUTUBE_STORAGE_KEYS.channelId, channelId);
}

export function getYoutubeAccessToken(storage?: YoutubeStore | null): string {
  const store = resolveStore(storage);
  if (!store) return "";
  return read(store, YOUTUBE_STORAGE_KEYS.token) || "";
}

export function getYoutubeRefreshToken(storage?: YoutubeStore | null): string {
  const store = resolveStore(storage);
  if (!store) return "";
  return read(store, YOUTUBE_STORAGE_KEYS.refreshToken) || "";
}

export function getYoutubeTokenExpiresAt(storage?: YoutubeStore | null): string {
  const store = resolveStore(storage);
  if (!store) return "";
  return read(store, YOUTUBE_STORAGE_KEYS.expiresAt) || "";
}

export function setYoutubeAccessToken(
  token: string,
  storage?: YoutubeStore | null,
): void {
  const store = resolveStore(storage);
  if (!store || !token) return;
  write(store, YOUTUBE_STORAGE_KEYS.token, token);
}

export function setYoutubeRefreshToken(
  token: string,
  storage?: YoutubeStore | null,
): void {
  const store = resolveStore(storage);
  if (!store || !token) return;
  write(store, YOUTUBE_STORAGE_KEYS.refreshToken, token);
}

export function setYoutubeTokenExpiresAt(
  expiresAt: string | number,
  storage?: YoutubeStore | null,
): void {
  const store = resolveStore(storage);
  if (!store) return;
  write(store, YOUTUBE_STORAGE_KEYS.expiresAt, String(expiresAt));
}

export function clearYoutubeApiData(storage?: YoutubeStore | null): void {
  const store = resolveStore(storage);
  if (!store) return;
  for (const key of API_DATA_KEYS) {
    remove(store, key);
  }
}

export function clearYoutubeSession(storage?: YoutubeStore | null): void {
  const store = resolveStore(storage);
  if (store) {
    for (const key of SESSION_KEYS) {
      remove(store, key);
    }
  }

  const session = browserSessionStorage();
  if (session) {
    remove(session, YOUTUBE_STORAGE_KEYS.oauthState);
    remove(session, YOUTUBE_STORAGE_KEYS.codeVerifier);
  }

  try {
    resetYoutubeLiveGate();
  } catch {
    // ignore when DOM/live gate is unavailable in tests
  }
}
