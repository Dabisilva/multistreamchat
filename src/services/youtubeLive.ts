export interface YoutubeLiveInfo {
  videoId: string;
  liveChatId: string;
  concurrentViewers: number | null;
  isLive: boolean;
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

const LIVE_STATUSES = new Set(["live", "liveStarting", "testing"]);
const QUOTA_COOLDOWN_MS = 30 * 60_000;
const IDLE_RETRY_MS = 2 * 60_000;

export class YoutubeQuotaError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
    this.name = "YoutubeQuotaError";
  }
}

export function isYoutubeQuotaError(status: number, errorText: string): boolean {
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

export function isLiveChatGoneError(status: number, errorText: string): boolean {
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

function pickLiveBroadcast(items: BroadcastItem[]): BroadcastItem | null {
  if (!items?.length) return null;

  const live = items.find((item) =>
    LIVE_STATUSES.has(item.status?.lifeCycleStatus || ""),
  );
  return live || items[0] || null;
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

  const isLive =
    !hasEnded &&
    (!!details.actualStartTime || concurrent != null || !!liveChatId);

  if (!isLive) return null;

  return {
    videoId,
    liveChatId,
    concurrentViewers: concurrent,
    isLive: true,
  };
}

async function discoverActiveLive(
  apiFetch: YoutubeFetch,
  includeViewers: boolean,
): Promise<YoutubeLiveInfo | null> {
  const url =
    "https://www.googleapis.com/youtube/v3/liveBroadcasts" +
    "?part=snippet,status&broadcastStatus=active&broadcastType=all&mine=true";

  const data = await readYoutubeJson(apiFetch, url);
  const activeLive = pickLiveBroadcast(data?.items || []);
  if (!activeLive?.id) return null;

  const liveChatId = activeLive.snippet?.liveChatId || "";

  if (!includeViewers && liveChatId) {
    return {
      videoId: activeLive.id,
      liveChatId,
      concurrentViewers: null,
      isLive: true,
    };
  }

  const fromVideo = await fetchLiveByVideoId(apiFetch, activeLive.id);

  if (fromVideo) {
    return {
      ...fromVideo,
      liveChatId: fromVideo.liveChatId || liveChatId,
    };
  }

  if (!liveChatId) return null;

  return {
    videoId: activeLive.id,
    liveChatId,
    concurrentViewers: null,
    isLive: true,
  };
}

/**
 * Caches the live video and prefers cheap videos.list polls (1 quota unit)
 * instead of rediscovering via liveBroadcasts on every tick.
 * When nothing is live, waits IDLE_RETRY_MS before discovering again.
 */
export class YoutubeLiveTracker {
  private videoId: string | null = null;
  private liveChatId: string | null = null;
  private quotaBlockedUntil = 0;
  private idleUntil = 0;
  private inFlight: Promise<YoutubeLiveInfo | null> | null = null;

  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaBlockedUntil;
  }

  isIdle(): boolean {
    return Date.now() < this.idleUntil;
  }

  getRetryDelayMs(): number {
    const now = Date.now();
    if (now < this.quotaBlockedUntil) {
      return Math.max(this.quotaBlockedUntil - now, 1000);
    }
    if (now < this.idleUntil) {
      return Math.max(this.idleUntil - now, 1000);
    }
    return IDLE_RETRY_MS;
  }

  markQuotaExceeded(): void {
    this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    this.videoId = null;
    this.liveChatId = null;
    this.idleUntil = 0;
  }

  clearLive(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.idleUntil = Date.now() + IDLE_RETRY_MS;
  }

  async refresh(
    apiFetch: YoutubeFetch,
    options?: { includeViewers?: boolean },
  ): Promise<YoutubeLiveInfo | null> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.refreshOnce(apiFetch, options?.includeViewers !== false)
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

  private async refreshOnce(
    apiFetch: YoutubeFetch,
    includeViewers: boolean,
  ): Promise<YoutubeLiveInfo | null> {
    if (this.isQuotaBlocked() || this.isIdle()) return null;

    if (this.videoId) {
      const info = await fetchLiveByVideoId(apiFetch, this.videoId);
      if (info) {
        this.liveChatId = info.liveChatId || this.liveChatId;
        return {
          ...info,
          liveChatId: this.liveChatId || "",
        };
      }
      this.clearLive();
      return null;
    }

    const info = await discoverActiveLive(apiFetch, includeViewers);
    if (!info) {
      this.clearLive();
      return null;
    }

    this.videoId = info.videoId;
    this.liveChatId = info.liveChatId || null;
    this.idleUntil = 0;
    return info;
  }
}
