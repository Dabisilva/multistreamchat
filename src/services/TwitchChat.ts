import tmi from 'tmi.js';
import { ChatMessage, ChatProvider } from '../types';

interface BttvEmote {
  id: string;
  code: string;
  imageType: string;
  animated: boolean;
}

export class TwitchChatService implements ChatProvider {
  private client: tmi.Client | null = null;
  private channel: string;
  private onMessage: (message: ChatMessage) => void;
  private connected: boolean = false;
  private badgeCache: Record<string, string> = {};
  private bttvEmotes: BttvEmote[] = [];

  constructor(channel: string, onMessage: (message: ChatMessage) => void) {
    this.channel = channel;
    this.onMessage = onMessage;
  }

  async connect(): Promise<void> {
    if (this.client) {
      this.disconnect();
    }

    // Fetch correct badge UUIDs from Twitch API
    await this.fetchBadgeUuids();
    
    // Fetch channel ID and BTTV emotes
    await this.fetchChannelIdAndBttv();

    this.client = new tmi.Client({
      options: { debug: false },
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [this.channel]
    });

    this.client.on('message', (channel, tags, message, self) => {
      if (self) return;

      const chatMessage: ChatMessage = {
        id: tags.id || `${Date.now()}-${Math.random()}`,
        userId: tags['user-id'] || '',
        displayName: tags['display-name'] || tags.username || '',
        displayColor: tags.color || '',
        text: message,
        badges: this.parseBadges(tags.badges as Record<string, string>),
        emotes: this.parseEmotes(tags.emotes as Record<string, string[]>, message),
        isAction: false,
        timestamp: Date.now(),
        provider: 'twitch',
        channel: channel.replace('#', ''),
        msgId: tags.id || ''
      };

      this.onMessage(chatMessage);
    });

    this.client.on('connected', () => {
      this.connected = true;
    });

    this.client.on('disconnected', () => {
      this.connected = false;
    });

    this.client.connect().catch(() => {
      // Connection error
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private parseBadges(badges: Record<string, string> | undefined): any[] {
    if (!badges) {
      return [];
    }

    return Object.entries(badges).map(([type, version]) => ({
      type,
      version,
      url: this.getBadgeUrl(type, version),
      description: this.getBadgeDescription(type)
    }));
  }

  private parseEmotes(emotes: Record<string, string[]> | undefined, message: string): any[] {
    const emoteList: any[] = [];
    
    // Parse Twitch native emotes
    if (emotes) {
      Object.entries(emotes).forEach(([id, positions]) => {
        positions.forEach(position => {
          const [start, end] = position.split('-').map(Number);
          const emoteName = message.substring(start, end + 1);
          
          emoteList.push({
            type: 'twitch',
            name: emoteName,
            id,
            gif: false,
            urls: {
              '1': `https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0`,
              '2': `https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0`,
              '4': `https://static-cdn.jtvnw.net/emoticons/v1/${id}/3.0`
            },
            start,
            end
          });
        });
      });
    }

    // Parse BTTV emotes - Add all available BTTV emotes to the list for name-based matching
    // We don't need position data since the messageUtils will use regex matching
    if (this.bttvEmotes.length > 0) {
      const words = message.split(/\s+/); // Split by any whitespace
      const uniqueBttvEmotes = new Set<string>();
      
      words.forEach(word => {
        const bttvEmote = this.bttvEmotes.find(e => e.code === word);
        if (bttvEmote && !uniqueBttvEmotes.has(bttvEmote.id)) {
          uniqueBttvEmotes.add(bttvEmote.id);
          const extension = bttvEmote.imageType === 'gif' ? 'gif' : 'png';
          
          emoteList.push({
            type: 'bttv',
            name: bttvEmote.code,
            id: bttvEmote.id,
            gif: bttvEmote.animated,
            urls: {
              '1': `https://cdn.betterttv.net/emote/${bttvEmote.id}/1x.${extension}`,
              '2': `https://cdn.betterttv.net/emote/${bttvEmote.id}/2x.${extension}`,
              '4': `https://cdn.betterttv.net/emote/${bttvEmote.id}/3x.${extension}`
            }
            // No start/end positions - will be matched by name using regex
          });
        }
      });
    }

    return emoteList;
  }

  private async fetchBadgeUuids(): Promise<void> {
    try {
      const response = await fetch('https://badges.twitch.tv/v1/badges/global/display?language=en');
      if (response.ok) {
        const data = await response.json();
        
        // Parse the badge data and cache UUIDs
        if (data.badge_sets) {
          Object.entries(data.badge_sets).forEach(([setId, setData]: [string, any]) => {
            if (setData.versions) {
              Object.entries(setData.versions).forEach(([_version, versionData]: [string, any]) => {
                if (versionData.image_url_1x) {
                  // Extract UUID from the image URL
                  const url = versionData.image_url_1x;
                  const uuidMatch = url.match(/\/badges\/v1\/([^\/]+)\/1/);
                  if (uuidMatch) {
                    this.badgeCache[setId] = uuidMatch[1];
                  }
                }
              });
            }
          });
        }
      }
    } catch (error) {
      // Error fetching badge UUIDs, will use fallback values
    }
  }

  private async fetchChannelIdAndBttv(): Promise<void> {
    try {
      // Try using the TMI client to get the channel ID from tags
      // Or use the alternative BetterTTV API endpoint that accepts channel name
      
      // First, fetch global BTTV emotes
      await this.fetchGlobalBttvEmotes();
      
      // Then try to fetch channel-specific emotes using the channel login name
      // Some BTTV APIs accept channel name directly
      const userResponse = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${this.channel}`);
      
      if (userResponse.ok) {
        const data = await userResponse.json();
        
        // Combine channel emotes and shared emotes
        const channelEmotes = data.channelEmotes || [];
        const sharedEmotes = data.sharedEmotes || [];
        const newEmotes = [...channelEmotes, ...sharedEmotes];
        
        // Add to existing global emotes (avoid duplicates)
        newEmotes.forEach(emote => {
          if (!this.bttvEmotes.find(e => e.id === emote.id)) {
            this.bttvEmotes.push(emote);
          }
        });
      }
    } catch (error) {
      // Failed to fetch BTTV emotes, will continue without them
    }
  }

  private async fetchGlobalBttvEmotes(): Promise<void> {
    try {
      const response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
      if (response.ok) {
        const globalEmotes = await response.json();
        this.bttvEmotes = globalEmotes || [];
      }
    } catch (error) {
      // Failed to fetch global BTTV emotes
    }
  }

  private getBadgeUrl(type: string, version: string): string {
    // Use cached UUIDs from API, fallback to hardcoded values
    const cachedUuid = this.badgeCache[type];
    if (cachedUuid) {
      return `https://static-cdn.jtvnw.net/badges/v1/${cachedUuid}/${version}`;
    }
    
    // Fallback to hardcoded UUIDs
    const badgeUuids: Record<string, string> = {
      'moderator': '39e717a8-00bc-49cc-b6d4-3ea91ee1be25',
      'subscriber': '3267646d-33f0-4b83-b647-fea1c131b58d',
      'broadcaster': '5527c58c-fb7d-422d-b31b-5fbe9c224b8d',
      'vip': '1eb73a56-aa74-4c23-a76d-f8a4c22e13a8',
      'partner': 'd12a2e27-af92-4d2e-aa09-8a8e9a96d2f0',
      'premium': 'bbce0ecc-5c30-4c7a-ba29-1e6f3449e5bd',
      'bits': 'ce6ed45c-30c1-4b7e-8153-8e93b80d1b09'
    };
    
    const uuid = badgeUuids[type] || 'a5962c22-8b92-4b2b-9c4e-5f1f8e9d7c6b';
    return `https://static-cdn.jtvnw.net/badges/v1/${uuid}/${version}`;
  }

  private getBadgeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'moderator': 'Moderator',
      'vip': 'VIP',
      'subscriber': 'Subscriber',
      'partner': 'Verified',
      'premium': 'Premium',
      'bits': 'Bits',
      'bits-leader': 'Bits Leader',
      'sub-gifter': 'Sub Gifter',
      'sub-gift-leader': 'Sub Gift Leader',
      'founder': 'Founder',
      'hype-train': 'Hype Train',
      'predictions': 'Predictions',
      'no-audio': 'No Audio',
      'no-video': 'No Video',
      'no-passthrough': 'No Passthrough',
      'turbo': 'Turbo',
      'prime': 'Prime',
      'game-developer': 'Game Developer',
      'admin': 'Admin',
      'staff': 'Staff',
      'broadcaster': 'Broadcaster'
    };

    return descriptions[type] || type;
  }
}

