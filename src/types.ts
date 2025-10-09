// Chat message interfaces
export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  displayColor: string;
  text: string;
  badges: Badge[];
  emotes: Emote[];
  thirdPartyEmotes?: Emote[]; // BTTV, FFZ, 7TV emotes
  isAction: boolean;
  timestamp: number;
  provider: 'twitch' | 'kick';
  channel: string;
  msgId: string;
}

export interface Badge {
  type: string;
  version: string;
  url: string;
  description: string;
}

export interface Emote {
  type: string;
  name: string;
  id: string;
  gif: boolean;
  urls: Record<string, string>;
  start?: number;
  end?: number;
  coords?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
}

export interface ChatConfig {
  hideAfter: number;
  messagesLimit: number;
  nickColor: 'user' | 'custom';
  customNickColor: string;
  hideCommands: boolean;
  ignoredUsers: string[];
  alignMessages: 'block' | 'bottom';
}

export interface MessageRowProps {
  message: ChatMessage;
  hideAfter: number;
  onRemove: (id: string) => void;
  customStyles?: {
    usernameBg: string;
    messageBg: string;
    messageColor: string;
    borderRadius: string;
    usernameFontSize: string;
    messageFontSize: string;
    messagePadding: string;
  };
}

export interface ChatProvider {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

// Twitch types
export interface TwitchTags {
  "display-name": string;
  color?: string;
  badges?: {
    [key: string]: string;
  };
  [key: string]: any;
}

// Kick API types - Updated to match actual API response
export interface KickChannelInfo {
  id: number;
  user_id: number;
  slug: string;
  is_banned: boolean;
  playback_url: string;
  name_updated_at: string;
  vod_enabled: boolean;
  subscription_enabled: boolean;
  followersCount: number;
  subscriber_badges: any[];
  banner_image: any;
  recent_categories: any[];
  livestream: any;
  role: any;
  muted: boolean;
  follower_badges: any[];
  verified: boolean;
  description: string;
  facebook_id: any;
  instagram_id: any;
  twitter_id: any;
  youtube_id: any;
  discord: any;
  tiktok_id: any;
  profilepic: string;
  channel_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  followers: any[];
  subscribers: any[];
  chatroom: {
    id: number;
    chatable_type: string;
    channel_id: number;
    created_at: string;
    updated_at: string;
    chat_mode_old: string;
    chat_mode: string;
    slow_mode: boolean;
    chatabled_id: number;
    followers_mode: boolean;
    subscribers_mode: boolean;
    emotes_mode: boolean;
    message_interval: number;
    following_min_duration: number;
  };
}

export interface KickMessage {
  id: number;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string | null;
      badges: Array<{
        id: number;
        name: string;
        image: string;
        type: string;
      }>;
    } | null;
  };
}

export interface KickMessageResponse {
  data: KickMessage[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

// Platform types
export type Platform = 'twitch' | 'kick';

// Legacy message interface (for compatibility)
export interface LegacyChatMessage {
  username: string;
  color: string | null;
  message: string;
  platform: Platform;
  badges?: Badge[];
  emotes?: any[];
  isAction?: boolean;
  msgId?: string;
  userId?: string;
}

// StreamElements event types
export interface StreamElementsEvent {
  detail: {
    listener: string;
    event?: any;
    field?: string;
  };
}

// Widget button event for testing
export interface WidgetButtonEvent {
  detail: {
    listener: string;
    event: {
      field: string;
    };
  };
}
