import tmi from 'tmi.js';
import { ChatMessage, ChatProvider } from '../types';

interface BttvEmote {
  id: string;
  code: string;
  imageType: string;
  animated: boolean;
}

interface TwitchBadgeVersion {
  id: string;
  image_url_1x: string;
  image_url_2x: string;
  image_url_4x: string;
  title: string;
  description: string;
}

interface TwitchBadgeSet {
  set_id: string;
  versions: TwitchBadgeVersion[];
}

export class TwitchChatService implements ChatProvider {
  private client: tmi.Client | null = null;
  private channel: string;
  private onMessage: (message: ChatMessage) => void;
  private connected: boolean = false;
  private globalBadges: Map<string, Map<string, TwitchBadgeVersion>> = new Map();
  private channelBadges: Map<string, Map<string, TwitchBadgeVersion>> = new Map();
  private bttvEmotes: BttvEmote[] = [];
  private clientId: string = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // Public Twitch client ID
  private oauthToken: string = ''; // OAuth token for authenticated requests
  private broadcasterId: string = '';

  constructor(
    channel: string, 
    onMessage: (message: ChatMessage) => void,
    options?: { clientId?: string; oauthToken?: string }
  ) {
    this.channel = channel;
    this.onMessage = onMessage;
    if (options?.clientId) this.clientId = options.clientId;
    if (options?.oauthToken) this.oauthToken = options.oauthToken;
  }

  async connect(): Promise<void> {
    if (this.client) {
      this.disconnect();
    }

    // Fetch broadcaster ID first (needed for channel badges and BTTV)
    await this.fetchBroadcasterId();
    
    // Fetch global and channel badges from Twitch Helix API
    await this.fetchGlobalBadges();
    await this.fetchChannelBadges();
    
    // Fetch BTTV emotes
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

    return Object.entries(badges).map(([type, version]) => {
      // Debug: Log badge parsing
  
      // Try to get description from API data (check channel badges first)
      let description = this.getBadgeDescription(type);
      
      // Check channel badges first
      const channelBadgeSet = this.channelBadges.get(type);
      if (channelBadgeSet) {
        const badgeVersion = channelBadgeSet.get(version);
        if (badgeVersion && badgeVersion.title) {
          description = badgeVersion.title;
        }
      } else {
        // Fall back to global badges
        const globalBadgeSet = this.globalBadges.get(type);
        if (globalBadgeSet) {
          const badgeVersion = globalBadgeSet.get(version);
          if (badgeVersion && badgeVersion.title) {
            description = badgeVersion.title;
          }
        }
      }

      return {
        type,
        version,
        url: this.getBadgeUrl(type, version),
        description
      };
    }).filter(badge => badge.url); // Only return badges with valid URLs
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

  private getTwitchHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Client-Id': this.clientId
    };
    
    if (this.oauthToken) {
      headers['Authorization'] = `Bearer ${this.oauthToken}`;
    }
    
    return headers;
  }

  private async fetchBroadcasterId(): Promise<void> {
    try {
  
      const response = await fetch(`https://api.twitch.tv/helix/users?login=${this.channel}`, {
        headers: this.getTwitchHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          this.broadcasterId = result.data[0].id;
      
        } else {
      
        }
      } else {
    
      }
    } catch (error) {
  
    }
  }

  private async fetchGlobalBadges(): Promise<void> {
    try {
      // Use Twitch Helix API to get global badges
      const response = await fetch('https://api.twitch.tv/helix/chat/badges/global', {
        headers: this.getTwitchHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data && Array.isArray(result.data)) {
          // Store badges in a nested map: set_id -> version_id -> badge data
          result.data.forEach((badgeSet: TwitchBadgeSet) => {
            const versionMap = new Map<string, TwitchBadgeVersion>();
            badgeSet.versions.forEach((version: TwitchBadgeVersion) => {
              versionMap.set(version.id, version);
            });
            this.globalBadges.set(badgeSet.set_id, versionMap);
          });
        }
      }
    } catch (error) {
      // Error fetching badges, will use fallback
    }
  }

  private async fetchChannelBadges(): Promise<void> {
    if (!this.broadcasterId) {
  
      return;
    }

    try {
  
      // Fetch channel-specific badges (requires OAuth token)
      // Note: This endpoint REQUIRES Authorization header with OAuth token
      const response = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${this.broadcasterId}`, {
        headers: this.getTwitchHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data && Array.isArray(result.data)) {
          // Store channel badges in a separate map
          result.data.forEach((badgeSet: TwitchBadgeSet) => {
            const versionMap = new Map<string, TwitchBadgeVersion>();
            badgeSet.versions.forEach((version: TwitchBadgeVersion) => {
              versionMap.set(version.id, version);
            });
            this.channelBadges.set(badgeSet.set_id, versionMap);
          });
          
          // Debug: Log fetched channel badges
      
        } else {
      
        }
      } else if (response.status === 404) {
    
      } else if (!this.oauthToken) {
        // Channel badges require OAuth token - this is expected
    
      } else {
    
      }
    } catch (error) {
  
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
        
    
      } else {
    
      }
    } catch (error) {
  
    }
  }

  private async fetchGlobalBttvEmotes(): Promise<void> {
    try {
  
      const response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
      if (response.ok) {
        const globalEmotes = await response.json();
        this.bttvEmotes = globalEmotes || [];
    
      } else {
    
      }
    } catch (error) {
  
    }
  }

  private getBadgeUrl(type: string, version: string): string {
    // Try to get badge from channel badges first (custom subscriber badges, etc.)
    const channelBadgeSet = this.channelBadges.get(type);
    if (channelBadgeSet) {
      const badgeVersion = channelBadgeSet.get(version);
      if (badgeVersion) {
        return badgeVersion.image_url_2x || badgeVersion.image_url_1x;
      }
    }

    // Try to get badge from the global badges map
    const globalBadgeSet = this.globalBadges.get(type);
    if (globalBadgeSet) {
      const badgeVersion = globalBadgeSet.get(version);
      if (badgeVersion) {
        return badgeVersion.image_url_2x || badgeVersion.image_url_1x;
      }
    }
    
    // For subscriber badges, try to use the version as a UUID if it looks like one
    if (type === 'subscriber' && version && version.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return `https://static-cdn.jtvnw.net/badges/v1/${version}/2`;
    }
    
    // Fallback to hardcoded UUIDs if API fetch failed
    const badgeUuids: Record<string, string> = {
      'moderator': '3267646d-33f0-4b17-b3df-f923a41db1d0',
      'subscriber': '5d9f2208-5dd8-11e7-8513-2ff4adfae661',
      'broadcaster': '5527c58c-fb7d-422d-b31b-5fbe9c224b8d',
      'vip': 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec',
      'partner': 'd12a2e27-16f6-41d0-ab77-b780518f00a3',
      'premium': 'bbbe0f0f-e328-4877-a9a5-dfa608cabf6b',
      'bits': '73b5c3fb-24f9-4a82-a852-2f5d2d94d635'
    };
    
    const uuid = badgeUuids[type];
    if (uuid) {
      return `https://static-cdn.jtvnw.net/badges/v1/${uuid}/${version}`;
    }
    
    // Final fallback - empty badge
    return '';
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

