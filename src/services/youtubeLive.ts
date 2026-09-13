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

const LIVE_STATUSES = new Set(["live"]);
const QUOTA_COOLDOWN_MS = 30 * 60_000;

try {
  localStorage.removeItem("youtubeLiveSession");
} catch {
  // ignore
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

  // Ended VODs often keep actualStartTime + chat id for hours. concurrentViewers
  // is only present on a real in-progress live.
  if (
    hasEnded ||
    !details.actualStartTime ||
    details.concurrentViewers == null
  ) {
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
): Promise<YoutubeLiveInfo | null> {
  if (!item?.id) return null;

  const fromVideo = await fetchLiveByVideoId(apiFetch, item.id);
  if (!fromVideo) return null;

  return {
    ...fromVideo,
    liveChatId: fromVideo.liveChatId || item.snippet?.liveChatId || "",
  };
}

function broadcastsForChannel(
  items: BroadcastItem[],
  channelId?: string,
): BroadcastItem[] {
  if (!channelId) return items;
  return items.filter(
    (item) => !item.snippet?.channelId || item.snippet.channelId === channelId,
  );
}

async function discoverActiveLive(
  apiFetch: YoutubeFetch,
  channelId?: string,
): Promise<YoutubeLiveInfo | null> {
  const active = await fetchBroadcasts(apiFetch, "broadcastStatus=active");
  return toLiveInfo(
    apiFetch,
    pickLiveBroadcast(broadcastsForChannel(active, channelId), false),
  );
}

/**
 * Resolves the current live once per overlay mount via liveBroadcasts.
 * A broadcast with liveChatId is not enough: ended/stuck lives often keep
 * that id and would start liveChatMessages polling (5 units every ~8s).
 * Confirm with videos.list (concurrentViewers). If offline, do not search
 * again until the page remounts.
 */
export class YoutubeLiveTracker {
  private videoId: string | null = null;
  private liveChatId: string | null = null;
  private channelId: string | null = null;
  private quotaBlockedUntil = 0;
  private liveResolved = false;
  private offline = false;
  private inFlight: Promise<YoutubeLiveInfo | null> | null = null;

  getLiveChatId(): string {
    return this.liveChatId || "";
  }

  remember(partial: { videoId?: string; liveChatId?: string }): void {
    if (partial.videoId) this.videoId = partial.videoId;
    if (partial.liveChatId) this.liveChatId = partial.liveChatId;
  }

  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaBlockedUntil;
  }

  isIdle(): boolean {
    return this.offline || this.isQuotaBlocked();
  }

  markQuotaExceeded(): void {
    this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    this.markOffline();
  }

  clearLive(): void {
    this.markOffline();
  }

  invalidateCache(): void {
    this.markOffline();
  }

  async refresh(
    apiFetch: YoutubeFetch,
    options?: YoutubeLiveRefreshOptions,
  ): Promise<YoutubeLiveInfo | null> {
    if (options?.channelId) this.channelId = options.channelId;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.refreshOnce(apiFetch)
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

  private markOffline(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.liveResolved = true;
    this.offline = true;
  }

  private async refreshOnce(
    apiFetch: YoutubeFetch,
  ): Promise<YoutubeLiveInfo | null> {
    if (this.isQuotaBlocked() || this.offline) return null;

    if (this.videoId) {
      const info = await fetchLiveByVideoId(apiFetch, this.videoId);
      if (info) {
        this.liveResolved = true;
        this.liveChatId = info.liveChatId || this.liveChatId;
        return {
          ...info,
          liveChatId: this.liveChatId || "",
        };
      }

      this.videoId = null;
      this.liveChatId = null;

      // Already confirmed a live this mount, or already searched: stop.
      if (this.liveResolved) {
        this.markOffline();
        return null;
      }
    }

    if (this.liveResolved) {
      this.markOffline();
      return null;
    }

    this.liveResolved = true;
    const info = await discoverActiveLive(
      apiFetch,
      this.channelId || undefined,
    );

    if (!info) {
      this.markOffline();
      return null;
    }

    this.offline = false;
    this.videoId = info.videoId;
    this.liveChatId = info.liveChatId || null;
    return info;
  }
}
