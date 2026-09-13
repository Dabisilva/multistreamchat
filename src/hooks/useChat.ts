import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, ChatConfig, Platform } from "@/types";
import { TwitchChatService } from "@/services/TwitchChat";
import { KickChatService } from "@/services/KickChat";
import { YoutubeChatService } from "@/services/YoutubeChat";
import { shouldHideMessage } from "@/utils/messageUtils";
import { DEFAULT_MESSAGE_STYLES } from "@/utils/styleDefaults";
import OAuthService from "@/services/OAuthService";
import {
  appendBounded,
  excludeProvider,
  getMessageKey,
  hasPrivilegedBadge,
  MessageIdSet,
  messageMatchesUser,
} from "@/utils/chatLogic";
import { DelayedMessageQueue } from "@/utils/delayedMessageQueue";
import { scrubSensitiveSearchParams } from "@/utils/sensitiveUrl";

const DEFAULT_DELAY_MS = 5000;
const MAX_DELAY_SECONDS = 6;
const TOKEN_REFRESH_THRESHOLD_MS = 600000;
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SERVICE_RECONNECT_DELAY_MS = 100;
const SCROLL_THRESHOLD = 100;
const MAX_PENDING_DELAYED = 250;

type ChatService = TwitchChatService | KickChatService | YoutubeChatService;

const DEFAULT_CONFIG: ChatConfig = {
  hideAfter: 180,
  messagesLimit: 20,
  nickColor: "user",
  customNickColor: "#ffffff",
  hideCommands: true,
  ignoredUsers: ["streamelements", "@streamelements", "cuscuzbot"],
  alignMessages: "bottom",
};

function manageService(
  serviceRef: React.MutableRefObject<ChatService | null>,
  channel: string,
  createService: () => ChatService,
) {
  if (serviceRef.current) {
    serviceRef.current.disconnect();
    serviceRef.current = null;
  }

  if (!channel) {
    return () => {};
  }

  const timeoutId = setTimeout(() => {
    const service = createService();
    void service.connect();
    serviceRef.current = service;
  }, SERVICE_RECONNECT_DELAY_MS);

  return () => {
    clearTimeout(timeoutId);
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
  };
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [twitchChannel, setTwitchChannel] = useState<string>("");
  const [kickChannel, setKickChannel] = useState<string>("");
  const [youtubeChannel, setYoutubeChannel] = useState<string>("");
  const [twitchOauthToken, setTwitchOauthToken] = useState<string>("");
  const [youtubeOauthToken, setYoutubeOauthToken] = useState<string>("");
  const [youtubeChannelId, setYoutubeChannelId] = useState<string>("");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState<string>("");
  const [broadcasterId, setBroadcasterId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [customStyles, setCustomStyles] = useState(DEFAULT_MESSAGE_STYLES);
  const [messageDelay, setMessageDelay] = useState<number>(DEFAULT_DELAY_MS);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const twitchServiceRef = useRef<TwitchChatService | null>(null);
  const kickServiceRef = useRef<KickChatService | null>(null);
  const youtubeServiceRef = useRef<YoutubeChatService | null>(null);
  const processedMessageIdsRef = useRef(new MessageIdSet());
  const delayQueueRef = useRef<DelayedMessageQueue | null>(null);

  const twitchOauthTokenRef = useRef(twitchOauthToken);
  twitchOauthTokenRef.current = twitchOauthToken;
  const youtubeOauthTokenRef = useRef(youtubeOauthToken);
  youtubeOauthTokenRef.current = youtubeOauthToken;

  const addMessage = (message: ChatMessage) => {
    setMessages((prevMessages) =>
      appendBounded(prevMessages, message, config.messagesLimit),
    );
  };

  const addMessageRef = useRef(addMessage);
  addMessageRef.current = addMessage;

  if (!delayQueueRef.current) {
    delayQueueRef.current = new DelayedMessageQueue({
      delayMs: messageDelay,
      maxPending: MAX_PENDING_DELAYED,
      onRelease: (message) => addMessageRef.current(message),
    });
  }

  const refreshTwitchTokenIfNeeded = async (
    force = false,
  ): Promise<string | null> => {
    const twitchToken = localStorage.getItem("twitchToken");
    const refreshToken = localStorage.getItem("twitchRefreshToken");
    const expiresAt = localStorage.getItem("twitchTokenExpiresAt");

    if (!twitchToken || !refreshToken) return null;

    const shouldRefresh =
      force ||
      !expiresAt ||
      parseInt(expiresAt) - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

    if (shouldRefresh) {
      try {
        const tokenResponse =
          await OAuthService.refreshTwitchToken(refreshToken);
        const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

        localStorage.setItem("twitchToken", tokenResponse.access_token);
        localStorage.setItem("twitchTokenExpiresAt", newExpiresAt.toString());
        if (tokenResponse.refresh_token) {
          localStorage.setItem(
            "twitchRefreshToken",
            tokenResponse.refresh_token,
          );
        }

        setTwitchOauthToken(tokenResponse.access_token);
        return tokenResponse.access_token;
      } catch {
        return null;
      }
    }

    return twitchToken;
  };

  const refreshYoutubeTokenIfNeeded = async (
    force = false,
  ): Promise<string | null> => {
    const youtubeToken = localStorage.getItem("youtubeToken");
    const refreshToken = localStorage.getItem("youtubeRefreshToken");
    const expiresAt = localStorage.getItem("youtubeTokenExpiresAt");

    if (!youtubeToken) return null;
    if (!refreshToken) return youtubeToken;

    const shouldRefresh =
      force ||
      !expiresAt ||
      parseInt(expiresAt) - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

    if (shouldRefresh) {
      try {
        const tokenResponse =
          await OAuthService.refreshYoutubeToken(refreshToken);
        const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

        localStorage.setItem("youtubeToken", tokenResponse.access_token);
        localStorage.setItem("youtubeTokenExpiresAt", newExpiresAt.toString());
        if (tokenResponse.refresh_token) {
          localStorage.setItem(
            "youtubeRefreshToken",
            tokenResponse.refresh_token,
          );
        }

        setYoutubeOauthToken(tokenResponse.access_token);
        return tokenResponse.access_token;
      } catch {
        return null;
      }
    }

    return youtubeToken;
  };

  const refreshTwitchTokenRef = useRef(refreshTwitchTokenIfNeeded);
  refreshTwitchTokenRef.current = refreshTwitchTokenIfNeeded;
  const refreshYoutubeTokenRef = useRef(refreshYoutubeTokenIfNeeded);
  refreshYoutubeTokenRef.current = refreshYoutubeTokenIfNeeded;

  const parseUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
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
        usernameBg:
          params.get("usernameBg") || DEFAULT_MESSAGE_STYLES.usernameBg,
        messageBg: params.get("messageBg") || DEFAULT_MESSAGE_STYLES.messageBg,
        messageColor:
          params.get("messageColor") || DEFAULT_MESSAGE_STYLES.messageColor,
        borderRadius:
          params.get("borderRadius") || DEFAULT_MESSAGE_STYLES.borderRadius,
        usernameFontSize:
          params.get("usernameFontSize") ||
          DEFAULT_MESSAGE_STYLES.usernameFontSize,
        messageFontSize:
          params.get("messageFontSize") ||
          DEFAULT_MESSAGE_STYLES.messageFontSize,
        messagePadding:
          params.get("messagePadding") || DEFAULT_MESSAGE_STYLES.messagePadding,
        fullWidthMessages:
          params.get("fullWidthMessages") ||
          DEFAULT_MESSAGE_STYLES.fullWidthMessages,
      },
    };
  };

  const removeMessage = (id: string) => {
    delayQueueRef.current?.cancel(id);
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
  };

  const handleNewMessage = (message: ChatMessage) => {
    const messageKey = getMessageKey(message);
    if (processedMessageIdsRef.current.has(messageKey)) return;

    processedMessageIdsRef.current.add(messageKey);

    if (
      shouldHideMessage(
        message.text,
        config.hideCommands,
        config.ignoredUsers,
        message.displayName,
        message.username,
      )
    ) {
      return;
    }

    if (hasPrivilegedBadge(message.badges)) {
      addMessage(message);
      return;
    }

    delayQueueRef.current?.enqueue(message);
  };

  const removeMessageByMsgId = (msgId: string) => {
    delayQueueRef.current?.cancelByMsgId(msgId);
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg.msgId !== msgId && msg.id !== msgId),
    );
  };

  const removeMessagesByUser = (username: string) => {
    delayQueueRef.current?.cancelByUser(username);
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => !messageMatchesUser(msg, username)),
    );
  };

  const handleNewMessageRef = useRef(handleNewMessage);
  handleNewMessageRef.current = handleNewMessage;
  const removeMessageByMsgIdRef = useRef(removeMessageByMsgId);
  removeMessageByMsgIdRef.current = removeMessageByMsgId;
  const removeMessagesByUserRef = useRef(removeMessagesByUser);
  removeMessagesByUserRef.current = removeMessagesByUser;

  const clearPlatformState = (provider: Platform) => {
    delayQueueRef.current?.cancelByProvider(provider);
    processedMessageIdsRef.current.deleteByPrefix(`${provider}:`);
    setMessages((prev) => excludeProvider(prev, provider));
  };

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current || window.name !== "ChatWidget") return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollButton(
      scrollHeight - scrollTop - clientHeight >= SCROLL_THRESHOLD,
    );
  };

  const getTwitchUserInfo = () => {
    const twitchUserInfo = localStorage.getItem("twitchUserInfo");
    let userInfo = null;

    if (twitchUserInfo) {
      try {
        userInfo = JSON.parse(twitchUserInfo);
      } catch {
        // Error parsing
      }
    }

    if (broadcasterId && userInfo) {
      userInfo.broadcasterId = broadcasterId;
    } else if (broadcasterId && !userInfo) {
      userInfo = { broadcasterId };
    }

    return userInfo;
  };

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const urlParams = parseUrlParams();

      if (urlParams.messageDelay) {
        const delaySeconds = parseFloat(urlParams.messageDelay);
        const delayMs =
          Math.min(Math.max(delaySeconds, 0), MAX_DELAY_SECONDS) * 1000;
        if (!cancelled) setMessageDelay(delayMs);
      }

      if (!cancelled) setCustomStyles(urlParams.styles);

      const hasUrlParams =
        (urlParams.twitchChannel && urlParams.twitchToken) ||
        urlParams.kickChannel ||
        (urlParams.youtubeChannel && urlParams.youtubeToken);

      if (hasUrlParams) {
        if (urlParams.twitchChannel && urlParams.twitchToken) {
          localStorage.setItem("twitchToken", urlParams.twitchToken);
          localStorage.setItem(
            "twitchChannelInfo",
            JSON.stringify({
              username: urlParams.twitchChannel,
              id: urlParams.broadcasterId,
              platform: "twitch",
            }),
          );

          if (urlParams.clientId)
            localStorage.setItem("twitchClientId", urlParams.clientId);
          if (urlParams.refreshToken)
            localStorage.setItem("twitchRefreshToken", urlParams.refreshToken);
          if (urlParams.expiresAt)
            localStorage.setItem("twitchTokenExpiresAt", urlParams.expiresAt);

          const validToken =
            (await refreshTwitchTokenIfNeeded(true)) || urlParams.twitchToken;

          if (!cancelled) {
            setTwitchChannel(urlParams.twitchChannel);
            setTwitchOauthToken(validToken);
            if (urlParams.broadcasterId)
              setBroadcasterId(urlParams.broadcasterId);
            if (urlParams.clientId) setClientId(urlParams.clientId);
          }
        }

        if (urlParams.kickChannel && !cancelled) {
          setKickChannel(urlParams.kickChannel);
        }

        if (urlParams.youtubeChannel && urlParams.youtubeToken) {
          localStorage.setItem("youtubeToken", urlParams.youtubeToken);
          localStorage.setItem(
            "youtubeChannelInfo",
            JSON.stringify({
              username: urlParams.youtubeChannel,
              id: urlParams.youtubeChannelId,
              platform: "youtube",
            }),
          );
          if (urlParams.youtubeChannelId)
            localStorage.setItem("youtubeChannelId", urlParams.youtubeChannelId);
          if (urlParams.youtubeRefreshToken)
            localStorage.setItem(
              "youtubeRefreshToken",
              urlParams.youtubeRefreshToken,
            );
          if (urlParams.youtubeExpiresAt)
            localStorage.setItem(
              "youtubeTokenExpiresAt",
              urlParams.youtubeExpiresAt,
            );

          const validToken =
            (await refreshYoutubeTokenIfNeeded(true)) || urlParams.youtubeToken;

          if (!cancelled) {
            setYoutubeChannel(urlParams.youtubeChannel);
            setYoutubeOauthToken(validToken);
            if (urlParams.youtubeChannelId)
              setYoutubeChannelId(urlParams.youtubeChannelId);
            if (urlParams.youtubeLiveChatId)
              setYoutubeLiveChatId(urlParams.youtubeLiveChatId);
          }
        }

        scrubSensitiveSearchParams();
        return;
      }

      const twitchToken = localStorage.getItem("twitchToken");
      const twitchChannelInfo = localStorage.getItem("twitchChannelInfo");
      const savedKickChannel = localStorage.getItem("kickChannel");
      const youtubeToken = localStorage.getItem("youtubeToken");
      const youtubeChannelInfo = localStorage.getItem("youtubeChannelInfo");

      if (twitchToken && twitchChannelInfo) {
        try {
          const validToken = await refreshTwitchTokenIfNeeded(true);
          if (!cancelled && validToken) {
            const channelInfo = JSON.parse(twitchChannelInfo);
            setTwitchOauthToken(validToken);
            setTwitchChannel(channelInfo.username);
          }
        } catch {
          // Error parsing channel info
        }
      }

      if (savedKickChannel && !cancelled) {
        setKickChannel(savedKickChannel);
      }

      if (youtubeToken && youtubeChannelInfo) {
        try {
          const validToken = await refreshYoutubeTokenIfNeeded(true);
          if (!cancelled && validToken) {
            const channelInfo = JSON.parse(youtubeChannelInfo);
            setYoutubeOauthToken(validToken);
            setYoutubeChannel(channelInfo.username);
            setYoutubeChannelId(
              channelInfo.id || localStorage.getItem("youtubeChannelId") || "",
            );
          }
        } catch {
          // Error parsing channel info
        }
      }
    };

    void initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    delayQueueRef.current?.setDelay(messageDelay);
  }, [messageDelay]);

  useEffect(() => {
    if (!twitchOauthToken) return;
    const intervalId = setInterval(() => {
      void refreshTwitchTokenRef.current();
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [twitchOauthToken]);

  useEffect(() => {
    if (!youtubeOauthToken) return;
    const intervalId = setInterval(() => {
      void refreshYoutubeTokenRef.current();
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [youtubeOauthToken]);

  useEffect(() => {
    youtubeServiceRef.current?.setOauthToken(youtubeOauthToken);
  }, [youtubeOauthToken]);

  useEffect(() => {
    twitchServiceRef.current?.setOauthToken(twitchOauthToken);
  }, [twitchOauthToken]);

  useEffect(() => {
    clearPlatformState("twitch");
    return manageService(twitchServiceRef, twitchChannel, () => {
      const twitchClientId =
        clientId || localStorage.getItem("twitchClientId") || undefined;
      const userInfo = getTwitchUserInfo();

      return new TwitchChatService(
        twitchChannel,
        (message) => handleNewMessageRef.current(message),
        {
          clientId: twitchClientId,
          oauthToken: twitchOauthTokenRef.current || undefined,
          userInfo,
          onMessageDelete: (id) => removeMessageByMsgIdRef.current(id),
          onUserBanned: (username) => removeMessagesByUserRef.current(username),
          onTokenRefresh: () => refreshTwitchTokenRef.current(true),
        },
      );
    });
  }, [twitchChannel, clientId, broadcasterId]);

  useEffect(() => {
    clearPlatformState("kick");
    return manageService(kickServiceRef, kickChannel, () => {
      return new KickChatService(
        kickChannel,
        (message) => handleNewMessageRef.current(message),
        {
          onMessageDelete: (id) => removeMessageByMsgIdRef.current(id),
          onUserBanned: (username) => removeMessagesByUserRef.current(username),
        },
      );
    });
  }, [kickChannel]);

  const youtubeEnabled = Boolean(youtubeChannel && youtubeOauthToken);

  useEffect(() => {
    clearPlatformState("youtube");
    return manageService(
      youtubeServiceRef,
      youtubeEnabled ? youtubeChannel : "",
      () => {
        return new YoutubeChatService(
          youtubeChannel,
          (message) => handleNewMessageRef.current(message),
          {
            oauthToken: youtubeOauthTokenRef.current || undefined,
            channelId: youtubeChannelId || undefined,
            liveChatId: youtubeLiveChatId || undefined,
            onTokenRefresh: () => refreshYoutubeTokenRef.current(true),
          },
        );
      },
    );
  }, [youtubeEnabled, youtubeChannel, youtubeChannelId, youtubeLiveChatId]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const isPopup = window.name === "ChatWidget";
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const shouldStick =
      !isPopup ||
      distanceFromBottom < SCROLL_THRESHOLD ||
      el.scrollHeight <= el.clientHeight;

    if (!shouldStick) return;

    const frameId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current?.scrollHeight ?? 0,
        behavior: "smooth",
      });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      delayQueueRef.current?.dispose();
      delayQueueRef.current = null;
      processedMessageIdsRef.current.clear();
      twitchServiceRef.current?.disconnect();
      kickServiceRef.current?.disconnect();
      youtubeServiceRef.current?.disconnect();
    };
  }, []);

  return {
    messages,
    config,
    showScrollButton,
    chatContainerRef,
    scrollToBottom,
    handleScroll,
    customStyles,
    removeMessage,
  };
};
