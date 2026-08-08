import { hexToRgba } from "./colorUtils";

const DEFAULT_TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export interface ChatCustomizationSettings {
  usernameBgColor: string;
  messageBgColor: string;
  messageTextColor: string;
  usernameBgAlpha: string;
  messageBgAlpha: string;
  messageTextAlpha: string;
  borderRadius: string;
  usernameFontSize: string;
  messageFontSize: string;
  messagePadding: string;
  messageDelay: string;
  fullWidthMessages: boolean;
}

export interface ViewerCustomizationSettings {
  viewerFontSize: string;
  viewerTextColor: string;
  showTwitchViews: boolean;
  showKickViews: boolean;
  showYoutubeViews: boolean;
  sumViews: boolean;
}

export function buildAuthParams(): string[] {
  const params: string[] = [];

  const twitchToken = localStorage.getItem("twitchToken");
  const twitchUser = localStorage.getItem("twitchUserInfo");
  if (twitchToken && twitchUser) {
    try {
      const userData = JSON.parse(twitchUser);
      const storedClientId =
        localStorage.getItem("twitchClientId") ||
        (import.meta as any).env?.VITE_TWITCH_CLIENT_ID ||
        DEFAULT_TWITCH_CLIENT_ID;
      const broadcasterId = userData.broadcasterId || userData.id;
      const storedRefreshToken = localStorage.getItem("twitchRefreshToken");
      const storedExpiresAt = localStorage.getItem("twitchTokenExpiresAt");

      params.push(`twitchChannel=${encodeURIComponent(userData.username)}`);
      params.push(`twitchToken=${encodeURIComponent(twitchToken)}`);
      params.push(`broadcasterId=${encodeURIComponent(broadcasterId)}`);
      params.push(`clientId=${encodeURIComponent(storedClientId)}`);
      if (storedRefreshToken) {
        params.push(`refreshToken=${encodeURIComponent(storedRefreshToken)}`);
      }
      if (storedExpiresAt) {
        params.push(`expiresAt=${encodeURIComponent(storedExpiresAt)}`);
      }
    } catch {
      // ignore invalid twitch user json
    }
  }

  const savedKickChannel = localStorage.getItem("kickChannel");
  if (savedKickChannel) {
    params.push(`kickChannel=${encodeURIComponent(savedKickChannel)}`);
  }

  const youtubeToken = localStorage.getItem("youtubeToken");
  const youtubeUser = localStorage.getItem("youtubeUserInfo");
  if (youtubeToken && youtubeUser) {
    try {
      const userData = JSON.parse(youtubeUser);
      const channelId =
        userData.broadcasterId ||
        userData.id ||
        localStorage.getItem("youtubeChannelId") ||
        "";
      const storedRefreshToken = localStorage.getItem("youtubeRefreshToken");
      const storedExpiresAt = localStorage.getItem("youtubeTokenExpiresAt");

      params.push(`youtubeChannel=${encodeURIComponent(userData.username)}`);
      params.push(`youtubeToken=${encodeURIComponent(youtubeToken)}`);
      if (channelId) {
        params.push(`youtubeChannelId=${encodeURIComponent(channelId)}`);
      }
      if (storedRefreshToken) {
        params.push(
          `youtubeRefreshToken=${encodeURIComponent(storedRefreshToken)}`,
        );
      }
      if (storedExpiresAt) {
        params.push(`youtubeExpiresAt=${encodeURIComponent(storedExpiresAt)}`);
      }
    } catch {
      // ignore invalid youtube user json
    }
  }

  return params;
}

export function getChatCustomizationParams(
  settings: ChatCustomizationSettings,
): string {
  const usernameBgRgba = hexToRgba(
    settings.usernameBgColor,
    settings.usernameBgAlpha,
  );
  const messageBgRgba = hexToRgba(
    settings.messageBgColor,
    settings.messageBgAlpha,
  );
  const messageColorRgba = hexToRgba(
    settings.messageTextColor,
    settings.messageTextAlpha,
  );

  return (
    `&usernameBg=${encodeURIComponent(usernameBgRgba)}` +
    `&messageBg=${encodeURIComponent(messageBgRgba)}` +
    `&messageColor=${encodeURIComponent(messageColorRgba)}` +
    `&borderRadius=${settings.borderRadius}` +
    `&usernameFontSize=${settings.usernameFontSize}` +
    `&messageFontSize=${settings.messageFontSize}` +
    `&messagePadding=${settings.messagePadding}` +
    `&messageDelay=${settings.messageDelay}` +
    `&fullWidthMessages=${settings.fullWidthMessages}`
  );
}

export function getViewerCustomizationParams(
  settings: ViewerCustomizationSettings,
): string {
  return (
    `&viewerFontSize=${settings.viewerFontSize}` +
    `&viewerTextColor=${encodeURIComponent(settings.viewerTextColor)}` +
    `&showTwitch=${settings.showTwitchViews}` +
    `&showKick=${settings.showKickViews}` +
    `&showYoutube=${settings.showYoutubeViews}` +
    `&sumViews=${settings.sumViews}`
  );
}

export function buildChatWidgetUrl(
  baseUrl: string,
  settings: ChatCustomizationSettings,
): string {
  const params = buildAuthParams();
  if (params.length === 0) return "";
  return `${baseUrl}/chat?${params.join("&")}${getChatCustomizationParams(settings)}`;
}

export function buildViewerWidgetUrl(
  baseUrl: string,
  settings: ViewerCustomizationSettings,
): string {
  const params = buildAuthParams();
  if (params.length === 0) return "";
  return `${baseUrl}/viewers?${params.join("&")}${getViewerCustomizationParams(settings)}`;
}
