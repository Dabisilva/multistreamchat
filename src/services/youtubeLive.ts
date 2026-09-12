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
): Promise<YoutubeLiveInfo | null> {
  const url =
    "https://www.googleapis.com/youtube/v3/liveBroadcasts" +
    "?part=snippet,status&broadcastStatus=active&broadcastType=all&mine=true";

  const data = await readYoutubeJson(apiFetch, url);
  const activeLive = pickLiveBroadcast(data?.items || []);
  if (!activeLive?.id) return null;

  const liveChatId = activeLive.snippet?.liveChatId || "";
  const fromVideo = await fetchLiveByVideoId(apiFetch, activeLive.id);

  if (fromVideo) {
    return {
      ...fromVideo,
      liveChatId: fromVideo.liveChatId || liveChatId,
    };
  }

  return {
    videoId: activeLive.id,
    liveChatId,
    concurrentViewers: null,
    isLive: true,
  };
}

/**
 * Caches the live video and prefers cheap videos.list polls (1 quota unit)
 * instead of rediscovering via liveBroadcasts/search on every tick.
 */
export class YoutubeLiveTracker {
  private videoId: string | null = null;
  private liveChatId: string | null = null;
  private quotaBlockedUntil = 0;
  private idle = false;

  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaBlockedUntil;
  }

  isIdle(): boolean {
    return this.idle;
  }

  markQuotaExceeded(): void {
    this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    this.videoId = null;
    this.liveChatId = null;
    this.idle = true;
  }

  clearLive(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.idle = true;
  }

  async refresh(apiFetch: YoutubeFetch): Promise<YoutubeLiveInfo | null> {
    if (this.isQuotaBlocked() || this.idle) return null;

    try {
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

      const info = await discoverActiveLive(apiFetch);
      if (!info) {
        this.idle = true;
        return null;
      }

      this.videoId = info.videoId;
      this.liveChatId = info.liveChatId || null;
      return info;
    } catch (err) {
      if (err instanceof YoutubeQuotaError) {
        this.markQuotaExceeded();
        return null;
      }
      throw err;
    }
  }
}
