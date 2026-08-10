import type { MessageCustomStyles } from "../types";
import { hexToRgba } from "./colorUtils";
import type {
  ChatCustomizationSettings,
  ViewerCustomizationSettings,
} from "./widgetUrl";

/**
 * Naming pattern (matches widget URL params):
 * - Combined rgba styles: usernameBg, messageBg, messageColor
 * - Form hex/alpha pairs: {name}Color + {name}Alpha
 * - Viewer: viewerFontSize, viewerTextColor, showTwitch, showKick, showYoutube
 */
export const DEFAULT_MESSAGE_STYLES: MessageCustomStyles = {
  usernameBg: "",
  messageBg: "",
  messageColor: "#ffffff",
  borderRadius: "4",
  usernameFontSize: "20",
  messageFontSize: "20",
  messagePadding: "0",
  fullWidthMessages: "false",
};

export const DEFAULT_CHAT_SETTINGS: ChatCustomizationSettings = {
  usernameBgColor: "",
  usernameBgAlpha: "0",
  messageBgColor: "",
  messageBgAlpha: "0",
  messageColor: "#ffffff",
  messageColorAlpha: "1",
  borderRadius: DEFAULT_MESSAGE_STYLES.borderRadius,
  usernameFontSize: DEFAULT_MESSAGE_STYLES.usernameFontSize,
  messageFontSize: DEFAULT_MESSAGE_STYLES.messageFontSize,
  messagePadding: DEFAULT_MESSAGE_STYLES.messagePadding,
  messageDelay: "5",
  fullWidthMessages: DEFAULT_MESSAGE_STYLES.fullWidthMessages === "true",
};

export const DEFAULT_VIEWER_SETTINGS: ViewerCustomizationSettings = {
  viewerFontSize: "32",
  viewerTextColor: "#ffffff",
  showTwitch: true,
  showKick: true,
  showYoutube: true,
  sumViews: true,
};

export function toMessageStyles(
  settings: ChatCustomizationSettings,
): MessageCustomStyles {
  return {
    usernameBg: hexToRgba(settings.usernameBgColor, settings.usernameBgAlpha),
    messageBg: hexToRgba(settings.messageBgColor, settings.messageBgAlpha),
    messageColor: hexToRgba(settings.messageColor, settings.messageColorAlpha),
    borderRadius: settings.borderRadius,
    usernameFontSize: settings.usernameFontSize,
    messageFontSize: settings.messageFontSize,
    messagePadding: settings.messagePadding,
    fullWidthMessages: settings.fullWidthMessages.toString(),
  };
}
