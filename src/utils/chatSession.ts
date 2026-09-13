import type { MessageCustomStyles } from "@/types";
import { DEFAULT_MESSAGE_STYLES } from "@/utils/styleDefaults";

export const MAX_DELAY_SECONDS = 6;

export type WidgetStorage = Pick<Storage, "getItem" | "setItem">;

export type WidgetUrlParams = {
  twitchChannel: string | null;
  twitchToken: string | null;
  broadcasterId: string | null;
  clientId: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  kickChannel: string | null;
  youtubeChannel: string | null;
  youtubeToken: string | null;
  youtubeChannelId: string | null;
  youtubeLiveChatId: string | null;
  youtubeRefreshToken: string | null;
  youtubeExpiresAt: string | null;
  messageDelay: string | null;
  styles: MessageCustomStyles;
};

export type TwitchSession = {
  channel: string;
  token: string;
  broadcasterId: string;
  clientId: string;
};

export type YoutubeSession = {
  channel: string;
  token: string;
  channelId: string;
  liveChatId: string;
};

export type HydratedChatSession = {
  messageDelayMs: number | null;
  styles: MessageCustomStyles;
  kickChannel: string;
  twitch: TwitchSession | null;
  youtube: YoutubeSession | null;
  shouldScrubUrl: boolean;
};

type StoredChannelInfo = {
  username?: string;
  id?: string;
};

export function parseWidgetUrlParams(search: string): WidgetUrlParams {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return {
    twitchChannel: params.get("twitchChannel"),
    twitchToken: params.get("twitchToken"),
    broadcasterId: params.get("broadcasterId"),
    clientId: params.get("clientId"),
    refreshToken: params.get("refreshToken"),
    expiresAt: params.get("expiresAt"),
    kickChannel: params.get("kickChannel"),
    youtubeChannel: params.get("youtubeChannel"),
    youtubeToken: params.get("youtubeToken"),
    youtubeChannelId: params.get("youtubeChannelId"),
    youtubeLiveChatId: params.get("youtubeLiveChatId"),
    youtubeRefreshToken: params.get("youtubeRefreshToken"),
    youtubeExpiresAt: params.get("youtubeExpiresAt"),
    messageDelay: params.get("messageDelay"),
    styles: {
      usernameBg: params.get("usernameBg") || DEFAULT_MESSAGE_STYLES.usernameBg,
      messageBg: params.get("messageBg") || DEFAULT_MESSAGE_STYLES.messageBg,
      messageColor:
        params.get("messageColor") || DEFAULT_MESSAGE_STYLES.messageColor,
      borderRadius:
        params.get("borderRadius") || DEFAULT_MESSAGE_STYLES.borderRadius,
      usernameFontSize:
        params.get("usernameFontSize") ||
        DEFAULT_MESSAGE_STYLES.usernameFontSize,
      messageFontSize:
        params.get("messageFontSize") || DEFAULT_MESSAGE_STYLES.messageFontSize,
      messagePadding:
        params.get("messagePadding") || DEFAULT_MESSAGE_STYLES.messagePadding,
      fullWidthMessages:
        params.get("fullWidthMessages") ||
        DEFAULT_MESSAGE_STYLES.fullWidthMessages,
    },
  };
}

function parseStoredChannel(raw: string | null): StoredChannelInfo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredChannelInfo;
  } catch {
    return null;
  }
}

function parseMessageDelayMs(value: string | null): number | null {
  if (!value) return null;
  const delaySeconds = parseFloat(value);
  if (!Number.isFinite(delaySeconds)) return null;
  return Math.min(Math.max(delaySeconds, 0), MAX_DELAY_SECONDS) * 1000;
}

function persistTwitchFromUrl(
  urlParams: WidgetUrlParams,
  storage: WidgetStorage,
): void {
  if (!urlParams.twitchChannel || !urlParams.twitchToken) return;

  storage.setItem("twitchToken", urlParams.twitchToken);
  storage.setItem(
    "twitchChannelInfo",
    JSON.stringify({
      username: urlParams.twitchChannel,
      id: urlParams.broadcasterId,
      platform: "twitch",
    }),
  );
  if (urlParams.clientId) storage.setItem("twitchClientId", urlParams.clientId);
  if (urlParams.refreshToken)
    storage.setItem("twitchRefreshToken", urlParams.refreshToken);
  if (urlParams.expiresAt)
    storage.setItem("twitchTokenExpiresAt", urlParams.expiresAt);
}

function persistYoutubeFromUrl(
  urlParams: WidgetUrlParams,
  storage: WidgetStorage,
): void {
  if (!urlParams.youtubeChannel || !urlParams.youtubeToken) return;

  storage.setItem("youtubeToken", urlParams.youtubeToken);
  storage.setItem(
    "youtubeChannelInfo",
    JSON.stringify({
      username: urlParams.youtubeChannel,
      id: urlParams.youtubeChannelId,
      platform: "youtube",
    }),
  );
  if (urlParams.youtubeChannelId)
    storage.setItem("youtubeChannelId", urlParams.youtubeChannelId);
  if (urlParams.youtubeRefreshToken)
    storage.setItem("youtubeRefreshToken", urlParams.youtubeRefreshToken);
  if (urlParams.youtubeExpiresAt)
    storage.setItem("youtubeTokenExpiresAt", urlParams.youtubeExpiresAt);
}

function resolveTwitchSession(
  urlParams: WidgetUrlParams,
  storage: WidgetStorage,
): TwitchSession | null {
  persistTwitchFromUrl(urlParams, storage);

  const storedInfo = parseStoredChannel(storage.getItem("twitchChannelInfo"));
  const channel = urlParams.twitchChannel || storedInfo?.username || "";
  const token = urlParams.twitchToken || storage.getItem("twitchToken") || "";
  if (!channel || !token) return null;

  return {
    channel,
    token,
    broadcasterId:
      urlParams.broadcasterId || storedInfo?.id || "",
    clientId: urlParams.clientId || storage.getItem("twitchClientId") || "",
  };
}

function resolveYoutubeSession(
  urlParams: WidgetUrlParams,
  storage: WidgetStorage,
): YoutubeSession | null {
  persistYoutubeFromUrl(urlParams, storage);

  const storedInfo = parseStoredChannel(storage.getItem("youtubeChannelInfo"));
  const channel = urlParams.youtubeChannel || storedInfo?.username || "";
  const token = urlParams.youtubeToken || storage.getItem("youtubeToken") || "";
  if (!channel || !token) return null;

  return {
    channel,
    token,
    channelId:
      urlParams.youtubeChannelId ||
      storedInfo?.id ||
      storage.getItem("youtubeChannelId") ||
      "",
    liveChatId: urlParams.youtubeLiveChatId || "",
  };
}

function resolveKickChannel(
  urlParams: WidgetUrlParams,
  storage: WidgetStorage,
): string {
  return urlParams.kickChannel || storage.getItem("kickChannel") || "";
}

export function hydrateChatSession(
  search: string,
  storage: WidgetStorage,
): HydratedChatSession {
  const urlParams = parseWidgetUrlParams(search);
  const shouldScrubUrl = Boolean(
    urlParams.twitchToken ||
      urlParams.refreshToken ||
      urlParams.expiresAt ||
      urlParams.youtubeToken ||
      urlParams.youtubeRefreshToken ||
      urlParams.youtubeExpiresAt,
  );

  return {
    messageDelayMs: parseMessageDelayMs(urlParams.messageDelay),
    styles: urlParams.styles,
    kickChannel: resolveKickChannel(urlParams, storage),
    twitch: resolveTwitchSession(urlParams, storage),
    youtube: resolveYoutubeSession(urlParams, storage),
    shouldScrubUrl,
  };
}
