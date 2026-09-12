import { Badge, ChatMessage, ChatProvider } from "../types";
import { generateColor } from "../utils/messageUtils";
import {
  isLiveChatGoneError,
  isYoutubeQuotaError,
  YoutubeLiveTracker,
  YoutubeQuotaError,
} from "./youtubeLive";

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

const MIN_CHAT_POLL_MS = 8000;
const ERROR_RETRY_MS = 10_000;
const RATE_LIMIT_RETRY_MS = 30_000;
const AUTH_RETRY_MS = 30_000;

export class YoutubeChatService implements ChatProvider {
  private channel: string;
  private liveChatId: string;
  private oauthToken: string;
  private onMessage: (message: ChatMessage) => void;
  private onTokenRefresh?: () => Promise<string | null>;
  private connected = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private nextPageToken: string | null = null;
  private skipHistory = true;
  private stopped = false;
  private polling = false;
  private abortController: AbortController | null = null;
  private liveTracker = new YoutubeLiveTracker();

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
    this.liveChatId = options?.liveChatId || "";
    if (!this.liveChatId) {
      this.liveChatId = this.liveTracker.getLiveChatId();
    } else {
      this.liveTracker.remember({ liveChatId: this.liveChatId });
    }
    if (options?.onTokenRefresh) this.onTokenRefresh = options.onTokenRefresh;
  }

  setOauthToken(token: string): void {
    this.oauthToken = token;
  }

  async connect(): Promise<void> {
    this.stopped = false;
    this.abortController = new AbortController();

    if (!this.oauthToken) {
      return;
    }

    await this.pollMessages();
  }

  disconnect(): void {
    this.stopped = true;
    this.connected = false;
    this.polling = false;
    this.abortController?.abort();
    this.abortController = null;
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

  private isAbortError(err: unknown): boolean {
    return (
      err instanceof DOMException && err.name === "AbortError"
    ) || (err instanceof Error && err.name === "AbortError");
  }

  private async apiFetch(url: string, retried = false): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.oauthToken}`,
        Accept: "application/json",
      },
      signal: this.abortController?.signal,
    });

    if (response.status === 401 && !retried && this.onTokenRefresh) {
      const newToken = await this.onTokenRefresh();
      if (this.stopped) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (newToken) {
        this.oauthToken = newToken;
        return this.apiFetch(url, true);
      }
    }

    if (response.status === 403 || response.status === 429) {
      const errorText = await response.clone().text();
      if (isYoutubeQuotaError(response.status, errorText)) {
        this.liveTracker.markQuotaExceeded();
        throw new YoutubeQuotaError();
      }
    }

    return response;
  }

  private async resolveLiveChatId(): Promise<string> {
    const live = await this.liveTracker.refresh((url) => this.apiFetch(url), {
      includeViewers: false,
    });
    return live?.liveChatId || "";
  }

  private markChatEnded(): void {
    this.liveChatId = "";
    this.nextPageToken = null;
    this.skipHistory = true;
    this.connected = false;
    this.liveTracker.clearLive();
  }

  private schedulePoll(intervalMs: number): void {
    if (this.stopped) return;
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
    this.pollTimeout = setTimeout(() => {
      void this.pollMessages();
    }, Math.max(intervalMs, 1000));
  }

  private async pollMessages(): Promise<void> {
    if (this.stopped || this.polling) return;
    this.polling = true;

    try {
      if (!this.liveChatId) {
        this.liveChatId = await this.resolveLiveChatId();
        if (this.stopped) return;
        if (!this.liveChatId) {
          this.connected = false;
          this.schedulePoll(this.liveTracker.getRetryDelayMs());
          return;
        }
      }

      let url =
        "https://www.googleapis.com/youtube/v3/liveChat/messages" +
        `?liveChatId=${encodeURIComponent(this.liveChatId)}` +
        "&part=snippet,authorDetails&maxResults=200";

      if (this.nextPageToken) {
        url += `&pageToken=${encodeURIComponent(this.nextPageToken)}`;
      }

      const response = await this.apiFetch(url);
      if (this.stopped) return;

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();

        if (isYoutubeQuotaError(status, errorText)) {
          this.liveTracker.markQuotaExceeded();
          this.schedulePoll(this.liveTracker.getRetryDelayMs());
          return;
        }

        if (isLiveChatGoneError(status, errorText)) {
          this.markChatEnded();
          this.schedulePoll(this.liveTracker.getRetryDelayMs());
          return;
        }

        if (status === 400) {
          this.nextPageToken = null;
          this.skipHistory = true;
          this.schedulePoll(ERROR_RETRY_MS);
          return;
        }

        if (status === 401) {
          this.schedulePoll(AUTH_RETRY_MS);
          return;
        }

        if (status === 429) {
          this.schedulePoll(RATE_LIMIT_RETRY_MS);
          return;
        }

        this.schedulePoll(ERROR_RETRY_MS);
        return;
      }

      const data = await response.json();
      if (this.stopped) return;

      if (data.offlineAt) {
        this.markChatEnded();
        this.schedulePoll(this.liveTracker.getRetryDelayMs());
        return;
      }

      this.nextPageToken = data.nextPageToken || null;
      this.connected = true;

      const items: YoutubeLiveChatItem[] = data.items || [];

      if (this.skipHistory) {
        this.skipHistory = false;
      } else {
        for (const item of items) {
          if (this.stopped) return;
          this.processItem(item);
        }
      }

      const interval =
        typeof data.pollingIntervalMillis === "number"
          ? data.pollingIntervalMillis
          : 5000;

      this.schedulePoll(Math.max(interval, MIN_CHAT_POLL_MS));
    } catch (err) {
      if (this.stopped || this.isAbortError(err)) return;
      if (err instanceof YoutubeQuotaError) {
        this.schedulePoll(this.liveTracker.getRetryDelayMs());
        return;
      }
      this.schedulePoll(ERROR_RETRY_MS);
    } finally {
      this.polling = false;
    }
  }
}
