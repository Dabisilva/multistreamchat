export interface YoutubeLiveInfo {
  videoId: string;
  liveChatId: string;
  concurrentViewers: number | null;
  isLive: boolean;
}

export interface YoutubeLiveRefreshOptions {
  includeViewers?: boolean;
  channelId?: string;
}

type YoutubeFetch = (url: string) => Promise<Response>;

interface BroadcastItem {
  id?: string;
  snippet?: {
    liveChatId?: string;
    channelId?: string;
  };
  status?: {
    lifeCycleStatus?: string;
  };
}

const LIVE_STATUSES = new Set(["live", "liveStarting"]);
const QUOTA_COOLDOWN_MS = 30 * 60_000;
const LIVE_SESSION_KEY = "youtubeLiveSession";
const LIVE_SESSION_TTL_MS = 8 * 60 * 60_000;
const REDISCOVERY_MIN_MS = 30_000;
const REDISCOVERY_MAX_MS = 5 * 60_000;
const STREAM_RESTART_MS = 30_000;

export function nextYoutubeRediscoveryDelayMs(attempt: number): number {
  return Math.min(
    REDISCOVERY_MIN_MS * 2 ** Math.max(0, attempt),
    REDISCOVERY_MAX_MS,
  );
}

interface PersistedLiveSession {
  videoId: string | null;
  liveChatId: string | null;
  savedAt: number;
}

function readPersistedLiveSession(): PersistedLiveSession | null {
  try {
    const raw = localStorage.getItem(LIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLiveSession;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > LIVE_SESSION_TTL_MS) {
      localStorage.removeItem(LIVE_SESSION_KEY);
      return null;
    }
    if (!parsed.videoId && !parsed.liveChatId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedLiveSession(
  videoId: string | null,
  liveChatId: string | null,
): void {
  try {
    if (!videoId && !liveChatId) {
      localStorage.removeItem(LIVE_SESSION_KEY);
      return;
    }
    localStorage.setItem(
      LIVE_SESSION_KEY,
      JSON.stringify({
        videoId,
        liveChatId,
        savedAt: Date.now(),
      } satisfies PersistedLiveSession),
    );
  } catch {
    // ignore quota / private mode
  }
}

function clearPersistedLiveSession(): void {
  try {
    localStorage.removeItem(LIVE_SESSION_KEY);
  } catch {
    // ignore
  }
}

export class YoutubeQuotaError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
    this.name = "YoutubeQuotaError";
  }
}

export function isYoutubeQuotaError(
  status: number,
  errorText: string,
): boolean {
  if (status !== 403 && status !== 429) return false;

  try {
    const parsed = JSON.parse(errorText);
    const reason = String(parsed?.error?.errors?.[0]?.reason || "");
    const apiStatus = String(parsed?.error?.status || "");
    const message = String(parsed?.error?.message || "");
    const code = `${reason} ${apiStatus} ${message}`.toLowerCase();

    return (
      code.includes("quotaexceeded") ||
      code.includes("dailylimitexceeded") ||
      code.includes("ratelimitexceeded") ||
      code.includes("resource_exhausted")
    );
  } catch {
    return false;
  }
}

export function isLiveChatGoneError(
  status: number,
  errorText: string,
): boolean {
  if (status === 404) return true;
  if (status !== 403) return false;
  return !isYoutubeQuotaError(status, errorText);
}

async function readYoutubeJson(
  apiFetch: YoutubeFetch,
  url: string,
): Promise<any | null> {
  const response = await apiFetch(url);

  if (response.ok) {
    return response.json();
  }

  const errorText = await response.text();
  if (isYoutubeQuotaError(response.status, errorText)) {
    throw new YoutubeQuotaError();
  }

  return null;
}

function pickLiveBroadcast(
  items: BroadcastItem[],
  allowFirstIfUnmatched = false,
): BroadcastItem | null {
  if (!items?.length) return null;

  const live = items.find((item) =>
    LIVE_STATUSES.has(item.status?.lifeCycleStatus || ""),
  );
  if (live) return live;
  if (allowFirstIfUnmatched) return items[0] || null;
  return null;
}

async function fetchBroadcasts(
  apiFetch: YoutubeFetch,
  query: string,
): Promise<BroadcastItem[]> {
  const url =
    "https://www.googleapis.com/youtube/v3/liveBroadcasts" +
    `?part=snippet,status&broadcastType=all&${query}`;

  const data = await readYoutubeJson(apiFetch, url);
  return data?.items || [];
}

async function fetchLiveByVideoId(
  apiFetch: YoutubeFetch,
  videoId: string,
): Promise<YoutubeLiveInfo | null> {
  const videosUrl =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}`;

  const data = await readYoutubeJson(apiFetch, videosUrl);
  const details = data?.items?.[0]?.liveStreamingDetails;
  if (!details) return null;

  const hasEnded = !!details.actualEndTime;
  const liveChatId = details.activeLiveChatId || "";
  const concurrent =
    details.concurrentViewers != null
      ? parseInt(String(details.concurrentViewers), 10) || 0
      : null;

  // Upcoming Studio broadcasts often have a chat id without having started.
  if (hasEnded || !details.actualStartTime) {
    return null;
  }

  return {
    videoId,
    liveChatId,
    concurrentViewers: concurrent,
    isLive: true,
  };
}

async function toLiveInfo(
  apiFetch: YoutubeFetch,
  item: BroadcastItem | null,
  includeViewers: boolean,
): Promise<YoutubeLiveInfo | null> {
  if (!item?.id) return null;

  const liveChatId = item.snippet?.liveChatId || "";

  if (!includeViewers && liveChatId) {
    return {
      videoId: item.id,
      liveChatId,
      concurrentViewers: null,
      isLive: true,
    };
  }

  const fromVideo = await fetchLiveByVideoId(apiFetch, item.id);
  if (fromVideo) {
    return {
      ...fromVideo,
      liveChatId: fromVideo.liveChatId || liveChatId,
    };
  }

  return null;
}

async function resolveFromSearch(
  apiFetch: YoutubeFetch,
  channelId: string,
): Promise<YoutubeLiveInfo | null> {
  const searchUrl =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&channelId=${encodeURIComponent(channelId)}` +
    "&type=video&eventType=live&maxResults=1";

  const searchData = await readYoutubeJson(apiFetch, searchUrl);
  const videoId = searchData?.items?.[0]?.id?.videoId;
  if (!videoId) return null;

  return fetchLiveByVideoId(apiFetch, videoId);
}

async function discoverActiveLive(
  apiFetch: YoutubeFetch,
  includeViewers: boolean,
  channelId?: string,
  allowSearch = true,
): Promise<YoutubeLiveInfo | null> {
  const active = await fetchBroadcasts(
    apiFetch,
    "broadcastStatus=active&mine=true",
  );
  const fromCombined = await toLiveInfo(
    apiFetch,
    pickLiveBroadcast(active, false),
    includeViewers,
  );
  if (fromCombined) return fromCombined;

  const activeOnly = await fetchBroadcasts(apiFetch, "broadcastStatus=active");
  const fromActive = await toLiveInfo(
    apiFetch,
    pickLiveBroadcast(activeOnly, false),
    includeViewers,
  );
  if (fromActive) return fromActive;

  const mine = await fetchBroadcasts(apiFetch, "mine=true&maxResults=50");
  const mineLive = pickLiveBroadcast(mine, false);
  const fromMine = await toLiveInfo(apiFetch, mineLive, includeViewers);
  if (fromMine) return fromMine;

  // Upcoming Studio events are not live. Only chat may attach if a chat id exists.
  if (!includeViewers) {
    const upcoming = await fetchBroadcasts(
      apiFetch,
      "broadcastStatus=upcoming",
    );
    const upcomingLive =
      pickLiveBroadcast(upcoming, false) ||
      upcoming.find((item) => item.snippet?.liveChatId) ||
      null;
    const fromUpcoming = await toLiveInfo(
      apiFetch,
      upcomingLive,
      includeViewers,
    );
    if (fromUpcoming) return fromUpcoming;
  }

  if (allowSearch && channelId) {
    const fromSearch = await resolveFromSearch(apiFetch, channelId);
    if (fromSearch) return fromSearch;
  }

  return null;
}

/**
 * Finds the current live video, then cheaply polls videos.list while live.
 * If the stream is offline, rediscovers with bounded exponential backoff
 * instead of staying idle until remount.
 */
export class YoutubeLiveTracker {
  private videoId: string | null = null;
  private liveChatId: string | null = null;
  private channelId: string | null = null;
  private quotaBlockedUntil = 0;
  private nextDiscoveryAt = 0;
  private discoveryAttempts = 0;
  private inFlight: Promise<YoutubeLiveInfo | null> | null = null;

  constructor() {
    const cached = readPersistedLiveSession();
    if (!cached) return;
    this.videoId = cached.videoId;
    this.liveChatId = cached.liveChatId;
  }

  getLiveChatId(): string {
    return this.liveChatId || "";
  }

  remember(partial: { videoId?: string; liveChatId?: string }): void {
    if (partial.videoId) this.videoId = partial.videoId;
    if (partial.liveChatId) this.liveChatId = partial.liveChatId;
    this.persist();
  }

  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaBlockedUntil;
  }

  isIdle(): boolean {
    return !this.videoId && Date.now() < this.nextDiscoveryAt;
  }

  getRetryDelayMs(): number {
    if (this.isQuotaBlocked()) {
      return Math.max(this.quotaBlockedUntil - Date.now(), 1000);
    }
    if (this.nextDiscoveryAt > Date.now()) {
      return Math.max(this.nextDiscoveryAt - Date.now(), 1000);
    }
    return STREAM_RESTART_MS;
  }

  markQuotaExceeded(): void {
    this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    this.videoId = null;
    this.liveChatId = null;
    this.nextDiscoveryAt = this.quotaBlockedUntil;
    this.discoveryAttempts = 0;
    clearPersistedLiveSession();
  }

  clearLive(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.scheduleRediscovery();
    clearPersistedLiveSession();
  }

  invalidateCache(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.discoveryAttempts = 0;
    this.nextDiscoveryAt = Date.now() + STREAM_RESTART_MS;
    clearPersistedLiveSession();
  }

  private scheduleRediscovery(): void {
    this.nextDiscoveryAt =
      Date.now() + nextYoutubeRediscoveryDelayMs(this.discoveryAttempts);
    this.discoveryAttempts += 1;
  }

  async refresh(
    apiFetch: YoutubeFetch,
    options?: YoutubeLiveRefreshOptions,
  ): Promise<YoutubeLiveInfo | null> {
    if (options?.channelId) this.channelId = options.channelId;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.refreshOnce(
      apiFetch,
      options?.includeViewers !== false,
    )
      .catch((err) => {
        if (err instanceof YoutubeQuotaError) {
          this.markQuotaExceeded();
          return null;
        }
        throw err;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  private persist(): void {
    writePersistedLiveSession(this.videoId, this.liveChatId);
  }

  private async refreshOnce(
    apiFetch: YoutubeFetch,
    includeViewers: boolean,
  ): Promise<YoutubeLiveInfo | null> {
    if (this.isQuotaBlocked()) return null;

    if (this.videoId) {
      const info = await fetchLiveByVideoId(apiFetch, this.videoId);
      if (info) {
        this.liveChatId = info.liveChatId || this.liveChatId;
        this.persist();
        return {
          ...info,
          liveChatId: this.liveChatId || "",
        };
      }
      this.videoId = null;
      this.liveChatId = null;
      clearPersistedLiveSession();
      this.discoveryAttempts = 0;
      this.nextDiscoveryAt = Date.now() + STREAM_RESTART_MS;
      return null;
    }

    if (Date.now() < this.nextDiscoveryAt) return null;

    const info = await discoverActiveLive(
      apiFetch,
      includeViewers,
      this.channelId || undefined,
      this.discoveryAttempts === 0,
    );

    if (!info) {
      this.clearLive();
      return null;
    }

    this.discoveryAttempts = 0;
    this.nextDiscoveryAt = 0;

    this.videoId = info.videoId;
    this.liveChatId = info.liveChatId || null;
    this.persist();
    return info;
  }
}
