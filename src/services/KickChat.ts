import { Badge, ChatMessage, ChatProvider, Emote, KickChannelInfo, PlatformConnectionState } from '@/types';
import { isAbortError } from '@/utils/abort';

const PUSHER_APP_KEY = '32cbd69e4b950bf97679';
const HEARTBEAT_MS = 30_000;
const RECONNECT_MIN_MS = 5_000;
const RECONNECT_MAX_MS = 30_000;

export function nextKickReconnectDelayMs(attempt: number): number {
  return Math.min(RECONNECT_MIN_MS * 2 ** Math.max(0, attempt), RECONNECT_MAX_MS);
}

export class KickChatService implements ChatProvider {
  private channel: string;
  private onMessage: (message: ChatMessage) => void;
  private onMessageDelete?: (msgId: string) => void;
  private onUserBanned?: (username: string) => void;
  private connected = false;
  private chatroomId: number | null = null;
  private pusherSocket: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private connectGeneration = 0;
  private reconnectAttempt = 0;
  private abortController: AbortController | null = null;
  private connectionState: PlatformConnectionState = 'disconnected';

  constructor(
    channel: string,
    onMessage: (message: ChatMessage) => void,
    options?: { onMessageDelete?: (msgId: string) => void; onUserBanned?: (username: string) => void }
  ) {
    this.channel = channel;
    this.onMessage = onMessage;
    if (options?.onMessageDelete) this.onMessageDelete = options.onMessageDelete;
    if (options?.onUserBanned) this.onUserBanned = options.onUserBanned;
  }

  async connect(): Promise<void> {
    this.stopped = false;
    const generation = ++this.connectGeneration;
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.connectionState = 'connecting';

    try {
      const channelInfo = await this.getChannelInfo();
      if (this.isStale(generation)) return;
      if (!channelInfo?.chatroom?.id) {
        this.connectionState = 'error';
        this.scheduleReconnect();
        return;
      }

      this.chatroomId = channelInfo.chatroom.id;
      this.connectToPusher();
    } catch (error) {
      if (this.isStale(generation) || isAbortError(error)) return;
      this.connectionState = 'error';
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopped = true;
    this.connectGeneration += 1;
    this.connectionState = 'stopping';
    this.abortController?.abort();
    this.abortController = null;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.closeSocket();
    this.connected = false;
    this.connectionState = 'disconnected';
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionState(): PlatformConnectionState {
    return this.connectionState;
  }

  private isStale(generation: number): boolean {
    return this.stopped || generation !== this.connectGeneration;
  }

  private async getChannelInfo(): Promise<KickChannelInfo | null> {
    const response = await fetch(
      `https://kick.com/api/v1/channels/${this.channel}`,
      { signal: this.abortController?.signal },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as KickChannelInfo;
  }

  private connectToPusher(): void {
    if (this.stopped || !this.chatroomId) {
      return;
    }

    this.closeSocket();

    try {
      const wsUrl = `wss://ws-us2.pusher.com/app/${PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
      const socket = new WebSocket(wsUrl);
      this.pusherSocket = socket;

      socket.onopen = () => {
        if (this.stopped || this.pusherSocket !== socket) {
          try { socket.close(); } catch { /* ignore */ }
          return;
        }
        this.connected = true;
        this.reconnectAttempt = 0;
        this.connectionState = 'connected';
        this.startHeartbeat();
      };

      socket.onmessage = (event) => {
        if (this.stopped || this.pusherSocket !== socket) return;
        this.handleSocketMessage(event);
      };

      socket.onerror = () => {
        if (this.pusherSocket !== socket) return;
        this.connected = false;
        this.connectionState = 'error';
      };

      socket.onclose = () => {
        if (this.pusherSocket !== socket) return;
        this.pusherSocket = null;
        this.connected = false;
        this.stopHeartbeat();
        if (this.stopped) return;
        this.connectionState = 'reconnecting';
        this.scheduleReconnect();
      };
    } catch {
      if (!this.stopped) this.scheduleReconnect();
    }
  }

  private handleSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);

      if (data.event === 'pusher:connection_established') {
        const subscribeMessage = JSON.stringify({
          event: 'pusher:subscribe',
          data: {
            auth: '',
            channel: `chatrooms.${this.chatroomId}.v2`
          }
        });
        this.pusherSocket?.send(subscribeMessage);
      } else if (data.event === 'App\\Events\\ChatMessageEvent') {
        this.handlePusherMessage(data);
      } else if (data.event === 'App\\Events\\MessageDeletedEvent') {
        this.handleMessageDeleted(data);
      } else if (data.event === 'App\\Events\\UserBannedEvent' || data.event === 'App\\Events\\BanEvent') {
        this.handleUserBanned(data);
      }
    } catch {
      // Failed to parse message
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.pusherSocket && this.pusherSocket.readyState === WebSocket.OPEN) {
        this.pusherSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private closeSocket(): void {
    const socket = this.pusherSocket;
    this.pusherSocket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try {
      socket.close();
    } catch {
      // ignore
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.clearReconnectTimer();
    const delay = nextKickReconnectDelayMs(this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.connectionState = 'reconnecting';
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.stopped) return;
      if (this.chatroomId) {
        this.connectToPusher();
      } else {
        void this.connect();
      }
    }, delay);
  }

  private handlePusherMessage(data: { data?: unknown }): void {
    try {
      const messageData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (messageData && messageData.sender && messageData.content) {
        this.processKickMessage(messageData);
      }
    } catch {
      // Failed to process message
    }
  }

  private handleMessageDeleted(data: { data?: unknown }): void {
    try {
      const messageData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      const raw =
        messageData?.message?.id ?? messageData?.message_id ?? messageData?.id;
      const msgId = raw != null ? String(raw) : '';

      if (msgId && this.onMessageDelete) {
        this.onMessageDelete(msgId);
      }
    } catch {
      // Failed to process message deletion
    }
  }

  private handleUserBanned(data: { data?: unknown }): void {
    try {
      const eventData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      const username = eventData?.user?.username || eventData?.username;

      if (username && this.onUserBanned) {
        this.onUserBanned(username.toLowerCase());
      }
    } catch {
      // Failed to process user ban
    }
  }

  private processKickMessage(data: {
    id?: string | number;
    content: string;
    sender: {
      id?: string | number;
      username?: string;
      identity?: { color?: string | null; badges?: unknown[] } | null;
    };
  }): void {
    if (this.stopped || !data.sender || !data.content) return;

    const badges = this.parseKickBadges(data.sender.identity?.badges || []);
    const username = data.sender.username || '';

    if (username.toLowerCase() === this.channel.toLowerCase()) {
      const hasBroadcasterBadge = badges.some(b =>
        b.type?.toLowerCase() === 'broadcaster' || b.type?.toLowerCase() === 'owner'
      );

      if (!hasBroadcasterBadge) {
        badges.push({
          type: 'broadcaster',
          version: '1',
          url: '',
          description: 'Channel Owner'
        });
      }
    }

    const id = data.id?.toString() || `${Date.now()}-${Math.random()}`;
    const chatMessage: ChatMessage = {
      id,
      userId: data.sender.id?.toString() || '',
      username,
      displayName: username,
      displayColor: data.sender.identity?.color || '',
      text: data.content,
      badges,
      emotes: this.parseKickEmotes(data.content),
      isAction: false,
      timestamp: Date.now(),
      provider: 'kick',
      channel: this.channel,
      msgId: data.id?.toString() || id,
    };

    this.onMessage(chatMessage);
  }

  private parseKickEmotes(message: string): Emote[] {
    const emotes: Emote[] = [];
    const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
    let match;

    while ((match = emoteRegex.exec(message)) !== null) {
      const [, id, name] = match;
      emotes.push({
        type: 'kick',
        name,
        id,
        gif: false,
        urls: {
          '1': `https://files.kick.com/emotes/${id}/fullsize`,
          '2': `https://files.kick.com/emotes/${id}/fullsize`,
          '4': `https://files.kick.com/emotes/${id}/fullsize`
        }
      });
    }

    return emotes;
  }

  private parseKickBadges(badges: unknown[]): Badge[] {
    if (!badges || !Array.isArray(badges)) {
      return [];
    }

    return badges.map((badge) => {
      const record = (badge ?? {}) as Record<string, unknown>;
      let badgeUrl = '';

      if (typeof record.image === 'string') {
        badgeUrl = record.image;
      } else if (record.badge_image && typeof record.badge_image === 'object') {
        const image = record.badge_image as { srcset?: string; src?: string };
        badgeUrl = image.srcset || image.src || '';
      } else if (record.id != null) {
        badgeUrl = `https://files.kick.com/badges/${record.id}/medium`;
      }

      const badgeType = String(record.type || record.slug || '').toLowerCase();

      return {
        type: badgeType,
        version: record.count != null ? String(record.count) : '1',
        url: badgeUrl,
        description: String(record.text || record.name || this.getKickBadgeDescription(badgeType))
      };
    }).filter(badge => badge.type);
  }

  private getKickBadgeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'subscriber': 'Subscriber',
      'sub_gifter': 'Sub Gifter',
      'moderator': 'Moderator',
      'vip': 'VIP',
      'og': 'OG',
      'verified': 'Verified',
      'founder': 'Founder',
      'broadcaster': 'Broadcaster',
      'staff': 'Staff',
      'super_admin': 'Super Admin'
    };

    return descriptions[type] || 'Badge';
  }
}
