export type ViewerPlatform = "twitch" | "kick" | "youtube";

export interface PlatformViewers {
  platform: ViewerPlatform;
  count: number | null;
  isLive: boolean;
  error?: string;
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

const TWITCH_CLIENT_ID =
  (import.meta as any).env?.VITE_TWITCH_CLIENT_ID ||
  "kimne78kx3ncx6brgo4mv6wki5h1ko";

export class ViewerCountService {
  private credentials: ViewerCountCredentials;
  private youtubeVideoId: string | null = null;

  constructor(credentials: ViewerCountCredentials) {
    this.credentials = credentials;
  }

  updateCredentials(credentials: Partial<ViewerCountCredentials>) {
    this.credentials = { ...this.credentials, ...credentials };
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
    } catch {
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
    } catch {
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
    let token = this.credentials.youtubeToken || "";
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
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

  private async resolveYoutubeVideoId(): Promise<string | null> {
    if (this.youtubeVideoId) return this.youtubeVideoId;

    const broadcastsUrl =
      "https://www.googleapis.com/youtube/v3/liveBroadcasts" +
      "?part=snippet,contentDetails,status&broadcastStatus=active&broadcastType=all&mine=true";

    const response = await this.youtubeFetch(broadcastsUrl);
    if (!response.ok) return null;

    const data = await response.json();
    const item = data.items?.[0];
    const videoId =
      item?.id ||
      item?.contentDetails?.boundStreamId ||
      item?.snippet?.resourceId?.videoId ||
      null;

    // liveBroadcasts id is the video id for the broadcast
    if (item?.id) {
      this.youtubeVideoId = item.id;
      return item.id;
    }

    return videoId;
  }

  private async fetchYoutube(): Promise<PlatformViewers> {
    if (!this.credentials.youtubeToken) {
      return {
        platform: "youtube",
        count: null,
        isLive: false,
        error: "Sem token",
      };
    }

    try {
      const videoId = await this.resolveYoutubeVideoId();

      if (!videoId) {
        this.youtubeVideoId = null;
        return { platform: "youtube", count: 0, isLive: false };
      }

      const videosUrl =
        "https://www.googleapis.com/youtube/v3/videos" +
        `?part=liveStreamingDetails,snippet&id=${encodeURIComponent(videoId)}`;

      const response = await this.youtubeFetch(videosUrl);
      if (!response.ok) {
        this.youtubeVideoId = null;
        return {
          platform: "youtube",
          count: null,
          isLive: false,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const video = data.items?.[0];
      const details = video?.liveStreamingDetails;
      const concurrent = details?.concurrentViewers;
      const hasEnded = !!details?.actualEndTime;
      const isLive = concurrent != null && !hasEnded;

      if (!isLive) {
        // Stream may have ended or never started
        this.youtubeVideoId = null;
        return { platform: "youtube", count: 0, isLive: false };
      }

      return {
        platform: "youtube",
        count: parseInt(String(concurrent), 10) || 0,
        isLive: true,
      };
    } catch {
      this.youtubeVideoId = null;
      return {
        platform: "youtube",
        count: null,
        isLive: false,
        error: "Falha ao buscar",
      };
    }
  }
}

export function formatViewerCount(count: number): string {
  return Math.max(0, Math.floor(count)).toLocaleString("pt-BR");
}
