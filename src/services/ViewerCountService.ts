import { isYoutubeLiveIdle, YoutubeLiveTracker, YoutubeQuotaError } from "@/services/youtubeLive";
import { isAbortError } from "@/utils/abort";
import { getTwitchClientId } from "@/utils/appEnv";

export type ViewerPlatform = "twitch" | "kick" | "youtube";

export interface PlatformViewers {
  platform: ViewerPlatform;
  count: number | null;
  isLive: boolean;
  error?: string;
  fetchedAt?: number;
}

export interface ViewerCountCredentials {
  twitchChannel?: string;
  twitchToken?: string;
  clientId?: string;
  kickChannel?: string;
  youtubeChannelId?: string;
  youtubeToken?: string;
  onTwitchTokenRefresh?: () => Promise<string | null>;
  onYoutubeTokenRefresh?: () => Promise<string | null>;
}

/** Live viewer statistics become unavailable if not refreshed within this window. */
export const YOUTUBE_VIEWER_STALE_MS = 120_000;

export function youtubeUnavailable(
  error?: string,
): PlatformViewers {
  return {
    platform: "youtube",
    count: 0,
    isLive: false,
    error,
  };
}

export function isYoutubeViewerFresh(
  stat: PlatformViewers,
  now = Date.now(),
): boolean {
  if (stat.platform !== "youtube") return true;
  if (!stat.isLive) return true;
  if (stat.fetchedAt == null) return false;
  return now - stat.fetchedAt < YOUTUBE_VIEWER_STALE_MS;
}

const TWITCH_CLIENT_ID = getTwitchClientId();

export class ViewerCountService {
  private credentials: ViewerCountCredentials;
  private youtubeLive = new YoutubeLiveTracker();
  private lastYoutube: PlatformViewers = youtubeUnavailable();
  private abortController = new AbortController();
  private now: () => number;

  constructor(
    credentials: ViewerCountCredentials,
    options?: { now?: () => number },
  ) {
    this.credentials = credentials;
    this.now = options?.now ?? Date.now;
  }

  updateCredentials(credentials: Partial<ViewerCountCredentials>) {
    const next = { ...this.credentials, ...credentials };
    if (next.youtubeChannelId !== this.credentials.youtubeChannelId) {
      this.resetYoutube();
    }
    this.credentials = next;
  }

  resetYoutube(): void {
    this.lastYoutube = youtubeUnavailable();
  }

  abortInFlight(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  async fetchAll(enabled: {
    twitch: boolean;
    kick: boolean;
    youtube: boolean;
  }): Promise<PlatformViewers[]> {
    const tasks: Promise<PlatformViewers>[] = [];

    if (enabled.twitch && this.credentials.twitchChannel) {
      tasks.push(this.fetchTwitch());
    }
    if (enabled.kick && this.credentials.kickChannel) {
      tasks.push(this.fetchKick());
    }
    if (enabled.youtube && this.credentials.youtubeToken) {
      tasks.push(this.fetchYoutube());
    }

    return Promise.all(tasks);
  }

  private async fetchTwitch(): Promise<PlatformViewers> {
    const channel = this.credentials.twitchChannel!;
    let token = this.credentials.twitchToken;
    const clientId = this.credentials.clientId || TWITCH_CLIENT_ID;

    if (!token) {
      return {
        platform: "twitch",
        count: null,
        isLive: false,
        error: "Sem token",
      };
    }

    try {
      let response = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Client-Id": clientId,
          },
          signal: this.abortController.signal,
        },
      );

      if (response.status === 401 && this.credentials.onTwitchTokenRefresh) {
        const newToken = await this.credentials.onTwitchTokenRefresh();
        if (newToken) {
          token = newToken;
          this.credentials.twitchToken = newToken;
          response = await fetch(
            `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Client-Id": clientId,
              },
              signal: this.abortController.signal,
            },
          );
        }
      }

      if (!response.ok) {
        return {
          platform: "twitch",
          count: null,
          isLive: false,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const stream = data.data?.[0];

      if (!stream) {
        return { platform: "twitch", count: 0, isLive: false };
      }

      return {
        platform: "twitch",
        count: stream.viewer_count ?? 0,
        isLive: true,
      };
    } catch (err) {
      if (isAbortError(err)) {
        return { platform: "twitch", count: null, isLive: false };
      }
      return {
        platform: "twitch",
        count: null,
        isLive: false,
        error: "Falha ao buscar",
      };
    }
  }

  private async fetchKick(): Promise<PlatformViewers> {
    const channel = this.credentials.kickChannel!;

    try {
      const response = await fetch(
        `https://kick.com/api/v1/channels/${encodeURIComponent(channel)}`,
        { signal: this.abortController.signal },
      );

      if (!response.ok) {
        return {
          platform: "kick",
          count: null,
          isLive: false,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const livestream = data.livestream;
      const isLive =
        !!livestream &&
        livestream.is_live !== false &&
        livestream.isLive !== false;

      if (!isLive) {
        return { platform: "kick", count: 0, isLive: false };
      }

      const count =
        livestream.viewer_count ??
        livestream.viewers ??
        livestream.viewerCount ??
        0;

      return {
        platform: "kick",
        count: typeof count === "number" ? count : Number(count) || 0,
        isLive: true,
      };
    } catch (err) {
      if (isAbortError(err)) {
        return { platform: "kick", count: null, isLive: false };
      }
      return {
        platform: "kick",
        count: null,
        isLive: false,
        error: "Falha ao buscar",
      };
    }
  }

  private async youtubeFetch(
    url: string,
    retried = false,
  ): Promise<Response> {
    const token = this.credentials.youtubeToken || "";
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: this.abortController.signal,
    });

    if (
      response.status === 401 &&
      !retried &&
      this.credentials.onYoutubeTokenRefresh
    ) {
      const newToken = await this.credentials.onYoutubeTokenRefresh();
      if (newToken) {
        this.credentials.youtubeToken = newToken;
        return this.youtubeFetch(url, true);
      }
    }

    return response;
  }

  private resolvedYoutube(): PlatformViewers {
    if (!isYoutubeViewerFresh(this.lastYoutube, this.now())) {
      this.lastYoutube = youtubeUnavailable();
    }
    return this.lastYoutube;
  }

  private rememberLiveYoutube(count: number): PlatformViewers {
    this.lastYoutube = {
      platform: "youtube",
      count,
      isLive: true,
      fetchedAt: this.now(),
    };
    return this.lastYoutube;
  }

  private async fetchYoutube(): Promise<PlatformViewers> {
    if (!this.credentials.youtubeToken) {
      this.resetYoutube();
      return youtubeUnavailable("Sem token");
    }

    if (
      this.youtubeLive.isQuotaBlocked() ||
      this.youtubeLive.isIdle() ||
      isYoutubeLiveIdle()
    ) {
      if (isYoutubeLiveIdle() && !this.youtubeLive.isQuotaBlocked()) {
        this.resetYoutube();
        return youtubeUnavailable();
      }
      return this.resolvedYoutube();
    }

    try {
      const live = await this.youtubeLive.refresh((url) => this.youtubeFetch(url), {
        channelId: this.credentials.youtubeChannelId || undefined,
      });

      if (!live && this.youtubeLive.isQuotaBlocked()) {
        return this.resolvedYoutube();
      }

      if (live?.isLive) {
        return this.rememberLiveYoutube(live.concurrentViewers ?? 0);
      }

      this.resetYoutube();
      return youtubeUnavailable();
    } catch (err) {
      if (isAbortError(err)) {
        return this.resolvedYoutube();
      }

      if (err instanceof YoutubeQuotaError) {
        this.youtubeLive.markQuotaExceeded();
        return this.resolvedYoutube();
      }

      this.resetYoutube();
      return youtubeUnavailable("Falha ao buscar");
    }
  }
}

export function formatViewerCount(count: number): string {
  return Math.max(0, Math.floor(count)).toLocaleString("pt-BR");
}
