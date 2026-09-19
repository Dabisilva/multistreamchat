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

export type YoutubeLiveStatus = "unknown" | "live" | "offline" | "quota";

type YoutubeLiveGate = {
  status: YoutubeLiveStatus;
  videoId: string | null;
  liveChatId: string | null;
};

let youtubeLiveGate: YoutubeLiveGate = {
  status: "unknown",
  videoId: null,
  liveChatId: null,
};
let youtubeLiveInFlight: Promise<YoutubeLiveInfo | null> | null = null;

export function getYoutubeLiveStatus(): YoutubeLiveStatus {
  return youtubeLiveGate.status;
}

export function isYoutubeLiveIdle(): boolean {
  return (
    youtubeLiveGate.status === "offline" || youtubeLiveGate.status === "quota"
  );
}

export function resetYoutubeLiveGate(): void {
  youtubeLiveGate = { status: "unknown", videoId: null, liveChatId: null };
  youtubeLiveInFlight = null;
}

function setGateOffline(): void {
  youtubeLiveGate = { status: "offline", videoId: null, liveChatId: null };
}

function setGateQuota(): void {
  youtubeLiveGate = { status: "quota", videoId: null, liveChatId: null };
}

function setGateLive(info: YoutubeLiveInfo): void {
  youtubeLiveGate = {
    status: "live",
    videoId: info.videoId || null,
    liveChatId: info.liveChatId || null,
  };
}

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
): BroadcastItem | null {
  if (!items?.length) return null;

  const live = items.find((item) =>
    LIVE_STATUSES.has(item.status?.lifeCycleStatus || ""),
  );
  return live || null;
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
    `?part=snippet,liveStreamingDetails&id=${encodeURIComponent(videoId)}`;

  const data = await readYoutubeJson(apiFetch, videosUrl);
  const item = data?.items?.[0];
  const details = item?.liveStreamingDetails;
  if (!details || details.actualEndTime) return null;

  const broadcastContent = item?.snippet?.liveBroadcastContent;
  if (broadcastContent === "none") return null;

  const liveChatId = details.activeLiveChatId || "";
  const concurrent =
    details.concurrentViewers != null
      ? parseInt(String(details.concurrentViewers), 10) || 0
      : null;

  if (broadcastContent !== "live") return null;

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
  if (!channelId || !channelId.startsWith("UC")) return items;
  return items.filter(
    (item) => !item.snippet?.channelId || item.snippet.channelId === channelId,
  );
}

async function discoverActiveLive(
  apiFetch: YoutubeFetch,
  channelId?: string,
): Promise<YoutubeLiveInfo | null> {
  const active = await fetchBroadcasts(apiFetch, "broadcastStatus=active");
  return toLiveInfo(apiFetch, pickLiveBroadcast(broadcastsForChannel(active, channelId)));
}

/**
 * Resolves the current live once per overlay mount via liveBroadcasts.
 * A broadcast with liveChatId is not enough: ended/stuck lives often keep
 * that id and would start liveChatMessages polling (5 units every ~15s).
 * Confirm with videos.list using liveBroadcastContent (not viewer count).
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
    return isYoutubeLiveIdle() || this.offline || this.isQuotaBlocked();
  }

  markQuotaExceeded(): void {
    this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    this.markOffline();
    setGateQuota();
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
    if (isYoutubeLiveIdle()) return null;
    if (this.inFlight) return this.inFlight;
    if (youtubeLiveInFlight) return youtubeLiveInFlight;

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
        youtubeLiveInFlight = null;
      });
    youtubeLiveInFlight = this.inFlight;

    return this.inFlight;
  }

  private markOffline(): void {
    this.videoId = null;
    this.liveChatId = null;
    this.liveResolved = true;
    this.offline = true;
    if (youtubeLiveGate.status !== "quota") {
      setGateOffline();
    }
  }

  private async refreshOnce(
    apiFetch: YoutubeFetch,
  ): Promise<YoutubeLiveInfo | null> {
    if (isYoutubeLiveIdle() || this.isQuotaBlocked() || this.offline) {
      return null;
    }

    if (youtubeLiveGate.status === "live" && youtubeLiveGate.liveChatId) {
      this.videoId = youtubeLiveGate.videoId;
      this.liveChatId = youtubeLiveGate.liveChatId;
      this.liveResolved = true;
      if (this.videoId) {
        const info = await fetchLiveByVideoId(apiFetch, this.videoId);
        if (info) {
          setGateLive(info);
          this.liveChatId = info.liveChatId || this.liveChatId;
          return {
            ...info,
            liveChatId: this.liveChatId || "",
          };
        }
        this.markOffline();
        return null;
      }
      return {
        videoId: this.videoId || "",
        liveChatId: this.liveChatId,
        concurrentViewers: null,
        isLive: true,
      };
    }

    if (this.videoId) {
      const info = await fetchLiveByVideoId(apiFetch, this.videoId);
      if (info) {
        this.liveResolved = true;
        this.offline = false;
        this.liveChatId = info.liveChatId || this.liveChatId;
        setGateLive({
          ...info,
          liveChatId: this.liveChatId || "",
        });
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
    setGateLive(info);
    return info;
  }
}
