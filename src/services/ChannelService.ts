// Channel Service for fetching channel information and badges

export interface ChannelInfo {
  id: string;
  username: string;
  displayName: string;
  description?: string;
  avatar?: string;
  followers?: number;
  subscribers?: number;
  isLive?: boolean;
  platform: 'twitch' | 'kick';
}

export interface ChannelBadges {
  global: Array<{
    type: string;
    versions: Array<{
      id: string;
      image_url_1x: string;
      image_url_2x: string;
      image_url_4x: string;
      title: string;
      description: string;
    }>;
  }>;
  channel: Array<{
    type: string;
    versions: Array<{
      id: string;
      image_url_1x: string;
      image_url_2x: string;
      image_url_4x: string;
      title: string;
      description: string;
    }>;
  }>;
}

export class ChannelService {
  private static instance: ChannelService;
  
  private constructor() {}

  static getInstance(): ChannelService {
    if (!ChannelService.instance) {
      ChannelService.instance = new ChannelService();
    }
    return ChannelService.instance;
  }

  /**
   * Get Twitch channel information
   */
  async getTwitchChannelInfo(username: string, accessToken?: string): Promise<ChannelInfo> {
    const headers: HeadersInit = {
      'Client-Id': (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch client ID
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get Twitch channel info: ${response.status}`);
    }

    const data = await response.json();
    const user = data.data[0];

    if (!user) {
      throw new Error(`Twitch channel '${username}' not found`);
    }

    // Get channel info
    const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${user.id}`, {
      headers
    });

    let channelData = null;
    if (channelResponse.ok) {
      const channelResult = await channelResponse.json();
      channelData = channelResult.data[0];
    }

    return {
      id: user.id,
      username: user.login,
      displayName: user.display_name,
      description: user.description,
      avatar: user.profile_image_url,
      followers: channelData?.followers_count,
      subscribers: channelData?.subscriber_count,
      isLive: channelData?.is_live,
      platform: 'twitch'
    };
  }

  /**
   * Get Kick channel information
   */
  async getKickChannelInfo(username: string, accessToken?: string): Promise<ChannelInfo> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`https://kick.com/api/v1/channels/${username}`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get Kick channel info: ${response.status}`);
    }

    const channel = await response.json();

    return {
      id: channel.id.toString(),
      username: channel.slug,
      displayName: channel.name,
      description: channel.description,
      avatar: channel.profilepic,
      followers: channel.followersCount,
      subscribers: channel.subscribers?.length || 0,
      isLive: channel.livestream !== null,
      platform: 'kick'
    };
  }

  /**
   * Get Twitch channel badges
   */
  async getTwitchChannelBadges(broadcasterId: string, accessToken?: string): Promise<ChannelBadges> {
    const headers: HeadersInit = {
      'Client-Id': (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch client ID
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Get global badges
    const globalResponse = await fetch('https://api.twitch.tv/helix/chat/badges/global', {
      headers
    });

    let globalBadges = [];
    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      globalBadges = globalData.data || [];
    }

    // Get channel badges (requires access token)
    let channelBadges = [];
    if (accessToken) {
      try {
        const channelResponse = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`, {
          headers
        });

        if (channelResponse.ok) {
          const channelData = await channelResponse.json();
          channelBadges = channelData.data || [];
        }
      } catch (error) {
        // Failed to fetch channel badges
      }
    }

    return {
      global: globalBadges,
      channel: channelBadges
    };
  }

  /**
   * Get Kick channel badges
   */
  async getKickChannelBadges(_username: string, _accessToken?: string): Promise<any[]> {
    // Kick doesn't have a public API for channel badges yet
    // This would need to be implemented when Kick provides badge APIs
    return [];
  }

  /**
   * Get channel emotes
   */
  async getChannelEmotes(username: string, platform: 'twitch' | 'kick', accessToken?: string): Promise<any[]> {
    if (platform === 'twitch') {
      return this.getTwitchEmotes(username, accessToken);
    } else {
      return this.getKickEmotes(username, accessToken);
    }
  }

  /**
   * Get Twitch emotes (BTTV, FFZ, 7TV)
   */
  private async getTwitchEmotes(username: string, _accessToken?: string): Promise<any[]> {
    const emotes = [];

    try {
      // Get BTTV emotes
      const bttvResponse = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${username}`);
      if (bttvResponse.ok) {
        const bttvData = await bttvResponse.json();
        const bttvEmotes = [
          ...(bttvData.channelEmotes || []),
          ...(bttvData.sharedEmotes || [])
        ].map(emote => ({
          ...emote,
          provider: 'bttv',
          url: `https://cdn.betterttv.net/emote/${emote.id}/2x`
        }));
        emotes.push(...bttvEmotes);
      }
    } catch (error) {
      // Failed to fetch BTTV emotes
    }

    try {
      // Get FFZ emotes
      const ffzResponse = await fetch(`https://api.frankerfacez.com/v1/room/${username}`);
      if (ffzResponse.ok) {
        const ffzData = await ffzResponse.json();
        const ffzEmotes = Object.values(ffzData.sets || {})
          .flatMap((set: any) => set.emoticons || [])
          .map((emote: any) => ({
            id: emote.id,
            name: emote.name,
            provider: 'ffz',
            url: emote.urls['2'] || emote.urls['1']
          }));
        emotes.push(...ffzEmotes);
      }
    } catch (error) {
      // Failed to fetch FFZ emotes
    }

    return emotes;
  }

  /**
   * Get Kick emotes
   */
  private async getKickEmotes(_username: string, _accessToken?: string): Promise<any[]> {
    // Kick emote API implementation would go here
    // Currently Kick doesn't have a public API for custom emotes
    return [];
  }
}

export default ChannelService.getInstance();
