import { ChatMessage, ChatProvider } from '../types';

export class KickChatService implements ChatProvider {
  private channel: string;
  private onMessage: (message: ChatMessage) => void;
  private connected: boolean = false;
  private chatroomId: number | null = null;
  private pusherSocket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(channel: string, onMessage: (message: ChatMessage) => void) {
    this.channel = channel;
    this.onMessage = onMessage;
  }

  async connect(): Promise<void> {
    try {
      // First, get the channel info to get the chatroom ID
      const channelInfo = await this.getChannelInfo();
      if (!channelInfo) {
        throw new Error('Failed to get channel info');
      }

      this.chatroomId = channelInfo.chatroom.id;
      
      // Connect to Kick's Pusher WebSocket
      this.connectToPusher();
    } catch (error) {
      // Failed to connect to Kick chat
    }
  }

  disconnect(): void {
    if (this.pusherSocket) {
      this.pusherSocket.close();
      this.pusherSocket = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async getChannelInfo(): Promise<any> {
    try {
      const response = await fetch(`https://kick.com/api/v1/channels/${this.channel}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  private connectToPusher(): void {
    if (!this.chatroomId) {
      return;
    }

    try {
      // Kick uses Pusher with specific app key
      const pusherAppKey = '32cbd69e4b950bf97679';
      const wsUrl = `wss://ws-us2.pusher.com/app/${pusherAppKey}?protocol=7&client=js&version=7.4.0&flash=false`;
      
      this.pusherSocket = new WebSocket(wsUrl);

      this.pusherSocket.onopen = () => {
        this.connected = true;
        
        // Start heartbeat to keep connection alive
        this.startHeartbeat();
      };

      this.pusherSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'pusher:connection_established') {
            // Connection successful, subscribe to the chat channel
            const subscribeMessage = JSON.stringify({
              event: 'pusher:subscribe',
              data: {
                auth: '',
                channel: `chatrooms.${this.chatroomId}.v2`
              }
            });
            this.pusherSocket?.send(subscribeMessage);
          } else if (data.event === 'App\\Events\\ChatMessageEvent') {
            // New chat message received
            this.handlePusherMessage(data);
          }
        } catch (error) {
          // Failed to parse message
        }
      };

      this.pusherSocket.onerror = () => {
        this.connected = false;
      };

      this.pusherSocket.onclose = () => {
        this.connected = false;
        // Attempt to reconnect after 5 seconds
        this.reconnectTimeout = setTimeout(() => {
          this.connectToPusher();
        }, 5000);
      };
    } catch (error) {
      // Failed to connect to Pusher
    }
  }

  private startHeartbeat(): void {
    // Send ping every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.pusherSocket && this.pusherSocket.readyState === WebSocket.OPEN) {
        this.pusherSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 30000);
  }

  private handlePusherMessage(data: any): void {
    try {
      const messageData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (messageData && messageData.sender && messageData.content) {
        this.processKickMessage(messageData);
      }
    } catch (error) {
      // Failed to process message
    }
  }

  private processKickMessage(data: any): void {
    if (!data.sender || !data.content) return;

    const chatMessage: ChatMessage = {
      id: data.id?.toString() || `${Date.now()}-${Math.random()}`,
      userId: data.sender.id?.toString() || '',
      displayName: data.sender.username || '',
      displayColor: data.sender.identity?.color || '',
      text: data.content,
      badges: this.parseKickBadges(data.sender.identity?.badges || []),
      emotes: [], // Kick doesn't have the same emote system as Twitch
      isAction: false,
      timestamp: Date.now(),
      provider: 'kick',
      channel: this.channel,
      msgId: data.id?.toString() || ''
    };

    this.onMessage(chatMessage);
  }

  private parseKickBadges(badges: any[]): any[] {
    return badges.map(badge => ({
      type: badge.type || 'custom',
      version: '1',
      url: badge.image || '',
      description: badge.name || 'Custom Badge'
    }));
  }
}
