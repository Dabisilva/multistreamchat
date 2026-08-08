import { Badge, ChatMessage, ChatProvider } from '../types';
import { generateColor } from '../utils/messageUtils';

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
    superChatDetails?: {
      amountDisplayString?: string;
      userComment?: string;
    };
    superStickerDetails?: {
      amountDisplayString?: string;
    };
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
    }
  ) {
    this.channel = channel;
    this.onMessage = onMessage;
    this.oauthToken = options?.oauthToken || '';
    this.channelId = options?.channelId || '';
    this.liveChatId = options?.liveChatId || '';
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
        // Not live yet — retry shortly
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
        type: 'broadcaster',
        version: '1',
        url: this.badgeUrl('broadcaster'),
        description: 'Channel Owner',
      });
    }

    if (author.isChatModerator) {
      badges.push({
        type: 'moderator',
        version: '1',
        url: this.badgeUrl('moderator'),
        description: 'Moderator',
      });
    }

    if (author.isChatSponsor) {
      badges.push({
        type: 'member',
        version: '1',
        url: this.badgeUrl('member'),
        description: 'Member',
      });
    }

    if (author.isVerified) {
      badges.push({
        type: 'verified',
        version: '1',
        url: this.badgeUrl('verified'),
        description: 'Verified',
      });
    }

    return badges;
  }

  private getMessageText(item: YoutubeLiveChatItem): string {
    const snippet = item.snippet;
    if (!snippet) return '';

    if (snippet.type === 'superChatEvent' && snippet.superChatDetails) {
      const amount = snippet.superChatDetails.amountDisplayString || '';
      const comment = snippet.superChatDetails.userComment || '';
      return comment ? `[Super Chat ${amount}] ${comment}` : `[Super Chat ${amount}]`;
    }

    if (snippet.type === 'superStickerEvent' && snippet.superStickerDetails) {
      const amount = snippet.superStickerDetails.amountDisplayString || '';
      return `[Super Sticker ${amount}]`;
    }

    return (
      snippet.displayMessage ||
      snippet.textMessageDetails?.messageText ||
      ''
    );
  }

  private processItem(item: YoutubeLiveChatItem): void {
    const text = this.getMessageText(item);
    if (!text || !item.authorDetails?.displayName) return;

    const type = item.snippet?.type;
    if (
      type &&
      type !== 'textMessageEvent' &&
      type !== 'superChatEvent' &&
      type !== 'superStickerEvent'
    ) {
      return;
    }

    const displayName = item.authorDetails.displayName;
    const chatMessage: ChatMessage = {
      id: item.id,
      userId: item.authorDetails.channelId || '',
      displayName,
      displayColor: generateColor(displayName),
      text,
      badges: this.parseBadges(item.authorDetails),
      emotes: [],
      isAction: false,
      timestamp: item.snippet?.publishedAt
        ? Date.parse(item.snippet.publishedAt)
        : Date.now(),
      provider: 'youtube',
      channel: this.channel,
      msgId: item.id,
    };

    this.onMessage(chatMessage);
  }

  private async apiFetch(url: string, retried = false): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.oauthToken}`,
        Accept: 'application/json',
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
    // Prefer active broadcast for the authenticated channel
    const broadcastsUrl =
      'https://www.googleapis.com/youtube/v3/liveBroadcasts' +
      '?part=snippet,status&broadcastStatus=active&broadcastType=all&mine=true';

    const broadcastRes = await this.apiFetch(broadcastsUrl);
    if (broadcastRes.ok) {
      const data = await broadcastRes.json();
      const liveChatId = data.items?.[0]?.snippet?.liveChatId;
      if (liveChatId) {
        if (!this.channelId && data.items[0]?.snippet?.channelId) {
          this.channelId = data.items[0].snippet.channelId;
        }
        return liveChatId;
      }
    }

    // Fallback: upcoming broadcast (useful right before going live)
    const upcomingUrl =
      'https://www.googleapis.com/youtube/v3/liveBroadcasts' +
      '?part=snippet,status&broadcastStatus=upcoming&broadcastType=all&mine=true';

    const upcomingRes = await this.apiFetch(upcomingUrl);
    if (upcomingRes.ok) {
      const data = await upcomingRes.json();
      const liveChatId = data.items?.[0]?.snippet?.liveChatId;
      if (liveChatId) return liveChatId;
    }

    return '';
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
    }

    try {
      let url =
        'https://www.googleapis.com/youtube/v3/liveChat/messages' +
        `?liveChatId=${encodeURIComponent(this.liveChatId)}` +
        '&part=snippet,authorDetails&maxResults=200';

      if (this.nextPageToken) {
        url += `&pageToken=${encodeURIComponent(this.nextPageToken)}`;
      }

      const response = await this.apiFetch(url);

      if (!response.ok) {
        const status = response.status;
        // Chat ended or not found — clear and retry discovering a new live chat
        if (status === 403 || status === 404) {
          this.liveChatId = '';
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
        // Match IRC join behavior: ignore backlog, only show new messages
        this.skipHistory = false;
      } else {
        for (const item of items) {
          this.processItem(item);
        }
      }

      const interval =
        typeof data.pollingIntervalMillis === 'number'
          ? data.pollingIntervalMillis
          : 5000;

      this.schedulePoll(interval);
    } catch {
      this.schedulePoll(10000);
    }
  }
}
