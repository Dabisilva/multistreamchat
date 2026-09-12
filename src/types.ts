// Chat message interfaces
export type Platform = 'twitch' | 'kick' | 'youtube';

export type PlatformConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'stopping'
  | 'error';

export interface ChatMessage {
  id: string;
  userId: string;
  /** Login/handle used for bans, timeouts and ignore lists. */
  username: string;
  displayName: string;
  displayColor: string;
  text: string;
  badges: Badge[];
  emotes: Emote[];
  thirdPartyEmotes?: Emote[];
  isAction: boolean;
  timestamp: number;
  provider: Platform;
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

export interface MessageCustomStyles {
  usernameBg: string;
  messageBg: string;
  messageColor: string;
  borderRadius: string;
  usernameFontSize: string;
  messageFontSize: string;
  messagePadding: string;
  fullWidthMessages?: string;
}

export interface MessageRowProps {
  message: ChatMessage;
  customStyles?: MessageCustomStyles;
  hideAfter?: number;
  onRemove?: (id: string) => void;
}

export interface ChatProvider {
  connect: () => void | Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
}

// Twitch types
export interface TwitchTags {
  "display-name": string;
  color?: string;
  badges?: Record<string, string>;
  id?: string;
  username?: string;
  "user-id"?: string;
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
  subscriber_badges: unknown[];
  banner_image: unknown;
  recent_categories: unknown[];
  livestream: unknown;
  role: unknown;
  muted: boolean;
  follower_badges: unknown[];
  verified: boolean;
  description: string;
  facebook_id: unknown;
  instagram_id: unknown;
  twitter_id: unknown;
  youtube_id: unknown;
  discord: unknown;
  tiktok_id: unknown;
  profilepic: string;
  channel_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  followers: unknown[];
  subscribers: unknown[];
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

export interface ViewerCount {
  platform: Platform;
  count: number | null;
  isLive: boolean;
  error?: string;
}
