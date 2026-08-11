import { Badge, ChatMessage, ChatProvider } from "../types";
import { generateColor } from "../utils/messageUtils";
import { resolveYoutubeLive } from "./youtubeLive";

interface YoutubeAuthorDetails {
  channelId?: string;
  channelUrl?: string;
  displayName?: string;
  profileImageUrl?: string;
  isVerified?: boolean;
  isChatOwner?: boolean;
  isChatSponsor?: boolean;
  isChatModerator?: boolean;
}

interface YoutubeLiveChatItem {
  id: string;
  snippet?: {
    type?: string;
    publishedAt?: string;
    displayMessage?: string;
    textMessageDetails?: { messageText?: string };
  };
  authorDetails?: YoutubeAuthorDetails;
}

export class YoutubeChatService implements ChatProvider {
  private channel: string;
  private channelId: string;
  private liveChatId: string;
  private oauthToken: string;
  private onMessage: (message: ChatMessage) => void;
  private onTokenRefresh?: () => Promise<string | null>;
  private connected = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private nextPageToken: string | null = null;
  private skipHistory = true;
  private stopped = false;

  constructor(
    channel: string,
    onMessage: (message: ChatMessage) => void,
    options?: {
      oauthToken?: string;
      channelId?: string;
      liveChatId?: string;
      onTokenRefresh?: () => Promise<string | null>;
    },
  ) {
    this.channel = channel.replace(/^@/, "");
    this.onMessage = onMessage;
    this.oauthToken = options?.oauthToken || "";
    this.channelId = options?.channelId || "";
    this.liveChatId = options?.liveChatId || "";
    if (options?.onTokenRefresh) this.onTokenRefresh = options.onTokenRefresh;
  }

  async connect(): Promise<void> {
    this.stopped = false;

    if (!this.oauthToken) {
      return;
    }

    try {
      if (!this.liveChatId) {
        this.liveChatId = await this.resolveLiveChatId();
      }

      if (!this.liveChatId) {
        this.schedulePoll(15000);
        return;
      }

      this.connected = true;
      await this.pollMessages();
    } catch {
      this.connected = false;
      this.schedulePoll(15000);
    }
  }

  disconnect(): void {
    this.stopped = true;
    this.connected = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private badgeUrl(type: string): string {
    return `${window.location.origin}/badges/youtube/${type}.svg`;
  }

  private parseBadges(author?: YoutubeAuthorDetails): Badge[] {
    if (!author) return [];

    const badges: Badge[] = [];

    if (author.isChatOwner) {
      badges.push({
        type: "broadcaster",
        version: "1",
        url: this.badgeUrl("broadcaster"),
        description: "Channel Owner",
      });
    }

    if (author.isChatModerator) {
      badges.push({
        type: "moderator",
        version: "1",
        url: this.badgeUrl("moderator"),
        description: "Moderator",
      });
    }

    if (author.isChatSponsor) {
      badges.push({
        type: "member",
        version: "1",
        url: this.badgeUrl("member"),
        description: "Member",
      });
    }

    if (author.isVerified) {
      badges.push({
        type: "verified",
        version: "1",
        url: this.badgeUrl("verified"),
        description: "Verified",
      });
    }

    return badges;
  }

  private processItem(item: YoutubeLiveChatItem): void {
    // Only normal chat messages — ignore Super Chat, stickers, memberships, etc.
    if (item.snippet?.type !== "textMessageEvent") return;

    const text =
      item.snippet.displayMessage ||
      item.snippet.textMessageDetails?.messageText ||
      "";
    const rawDisplayName = item.authorDetails?.displayName;
    if (!text || !rawDisplayName) return;

    const displayName = rawDisplayName.replace(/^@/, "");

    const chatMessage: ChatMessage = {
      id: item.id,
      userId: item.authorDetails?.channelId || "",
      displayName,
      displayColor: generateColor(displayName),
      text,
      badges: this.parseBadges(item.authorDetails),
      emotes: [],
      isAction: false,
      timestamp: item.snippet.publishedAt
        ? Date.parse(item.snippet.publishedAt)
        : Date.now(),
      provider: "youtube",
      channel: this.channel,
      msgId: item.id,
    };

    this.onMessage(chatMessage);
  }

  private async apiFetch(url: string, retried = false): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.oauthToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401 && !retried && this.onTokenRefresh) {
      const newToken = await this.onTokenRefresh();
      if (newToken) {
        this.oauthToken = newToken;
        return this.apiFetch(url, true);
      }
    }

    return response;
  }

  private async resolveLiveChatId(): Promise<string> {
    const live = await resolveYoutubeLive(
      (url) => this.apiFetch(url),
      this.channelId || undefined,
    );

    if (!live) return "";

    if (!this.channelId) {
      // channelId may still be unknown; keep whatever we had
    }

    return live.liveChatId || "";
  }

  private schedulePoll(intervalMs: number): void {
    if (this.stopped) return;
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
    this.pollTimeout = setTimeout(() => {
      void this.pollMessages();
    }, Math.max(intervalMs, 1000));
  }

  private async pollMessages(): Promise<void> {
    if (this.stopped) return;

    if (!this.liveChatId) {
      try {
        this.liveChatId = await this.resolveLiveChatId();
      } catch {
        this.schedulePoll(15000);
        return;
      }

      if (!this.liveChatId) {
        this.connected = false;
        this.schedulePoll(15000);
        return;
      }
      this.connected = true;
      this.skipHistory = true;
      this.nextPageToken = null;
    }

    try {
      let url =
        "https://www.googleapis.com/youtube/v3/liveChat/messages" +
        `?liveChatId=${encodeURIComponent(this.liveChatId)}` +
        "&part=snippet,authorDetails&maxResults=200";

      if (this.nextPageToken) {
        url += `&pageToken=${encodeURIComponent(this.nextPageToken)}`;
      }

      const response = await this.apiFetch(url);

      if (!response.ok) {
        const status = response.status;
        if (status === 403 || status === 404) {
          this.liveChatId = "";
          this.nextPageToken = null;
          this.skipHistory = true;
          this.connected = false;
          this.schedulePoll(15000);
          return;
        }

        this.schedulePoll(10000);
        return;
      }

      const data = await response.json();
      this.nextPageToken = data.nextPageToken || null;

      const items: YoutubeLiveChatItem[] = data.items || [];

      if (this.skipHistory) {
        this.skipHistory = false;
      } else {
        for (const item of items) {
          this.processItem(item);
        }
      }

      const interval =
        typeof data.pollingIntervalMillis === "number"
          ? data.pollingIntervalMillis
          : 5000;

      this.schedulePoll(interval);
    } catch {
      this.schedulePoll(10000);
    }
  }
}
