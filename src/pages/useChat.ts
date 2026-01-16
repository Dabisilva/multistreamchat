import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, ChatConfig } from '../types';
import { TwitchChatService } from '../services/TwitchChat';
import { KickChatService } from '../services/KickChat';
import { shouldHideMessage } from '../utils/messageUtils';
import OAuthService from '../services/OAuthService';

// Constants
const DEFAULT_DELAY_MS = 5000;
const MAX_DELAY_SECONDS = 6;
const TOKEN_REFRESH_THRESHOLD_MS = 600000; // 10 minutes
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SERVICE_RECONNECT_DELAY_MS = 100;
const PROCESSED_MESSAGES_LIMIT = 1000;
const PROCESSED_MESSAGES_KEEP = 500;
const SCROLL_THRESHOLD = 100;

const PRIVILEGED_BADGES = ['lead_moderator', 'moderator', 'vip', 'broadcaster', 'owner', 'og', 'staff', 'super_admin'];

const DEFAULT_CONFIG: ChatConfig = {
  hideAfter: 180,
  messagesLimit: 20,
  nickColor: 'user',
  customNickColor: '#ffffff',
  hideCommands: true,
  ignoredUsers: ['streamelements', '@streamelements', 'cuscuzbot'],
  alignMessages: 'bottom'
};

const DEFAULT_STYLES = {
  usernameBg: '#30034d',
  messageBg: '#8b5cf6',
  messageColor: '#ffffff',
  borderRadius: '10',
  usernameFontSize: '20',
  messageFontSize: '20',
  messagePadding: '0',
  fullWidthMessages: 'false'
};

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [twitchChannel, setTwitchChannel] = useState<string>('');
  const [kickChannel, setKickChannel] = useState<string>('');
  const [twitchOauthToken, setTwitchOauthToken] = useState<string>('');
  const [broadcasterId, setBroadcasterId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [customStyles, setCustomStyles] = useState(DEFAULT_STYLES);
  const [messageDelay, setMessageDelay] = useState<number>(DEFAULT_DELAY_MS);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingTimeoutsRef = useRef<Map<string, { timeout: NodeJS.Timeout; message: ChatMessage }>>(new Map());
  const twitchServiceRef = useRef<TwitchChatService | null>(null);
  const kickServiceRef = useRef<KickChatService | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Token refresh logic
  const refreshTwitchTokenIfNeeded = useCallback(async (): Promise<string | null> => {
    const twitchToken = localStorage.getItem('twitchToken');
    const refreshToken = localStorage.getItem('twitchRefreshToken');
    const expiresAt = localStorage.getItem('twitchTokenExpiresAt');

    if (!twitchToken || !refreshToken) return null;

    const shouldRefresh = !expiresAt || (parseInt(expiresAt) - Date.now()) < TOKEN_REFRESH_THRESHOLD_MS;

    if (shouldRefresh) {
      try {
        const tokenResponse = await OAuthService.refreshTwitchToken(refreshToken);
        const newExpiresAt = Date.now() + (tokenResponse.expires_in * 1000);

        localStorage.setItem('twitchToken', tokenResponse.access_token);
        localStorage.setItem('twitchTokenExpiresAt', newExpiresAt.toString());
        if (tokenResponse.refresh_token) {
          localStorage.setItem('twitchRefreshToken', tokenResponse.refresh_token);
        }

        setTwitchOauthToken(tokenResponse.access_token);
        return tokenResponse.access_token;
      } catch (err) {
        return null;
      }
    }

    return twitchToken;
  }, []);

  // Parse URL parameters helper
  const parseUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      twitchChannel: params.get('twitchChannel'),
      twitchToken: params.get('twitchToken'),
      broadcasterId: params.get('broadcasterId'),
      clientId: params.get('clientId'),
      refreshToken: params.get('refreshToken'),
      expiresAt: params.get('expiresAt'),
      kickChannel: params.get('kickChannel'),
      messageDelay: params.get('messageDelay'),
      styles: {
        usernameBg: params.get('usernameBg') || DEFAULT_STYLES.usernameBg,
        messageBg: params.get('messageBg') || DEFAULT_STYLES.messageBg,
        messageColor: params.get('messageColor') || DEFAULT_STYLES.messageColor,
        borderRadius: params.get('borderRadius') || DEFAULT_STYLES.borderRadius,
        usernameFontSize: params.get('usernameFontSize') || DEFAULT_STYLES.usernameFontSize,
        messageFontSize: params.get('messageFontSize') || DEFAULT_STYLES.messageFontSize,
        messagePadding: params.get('messagePadding') || DEFAULT_STYLES.messagePadding,
        fullWidthMessages: params.get('fullWidthMessages') || DEFAULT_STYLES.fullWidthMessages
      }
    };
  };

  // Initialize authentication
  const initAuth = useCallback(async () => {
    const urlParams = parseUrlParams();

    // Set message delay
    if (urlParams.messageDelay) {
      const delaySeconds = parseFloat(urlParams.messageDelay);
      const delayMs = Math.min(Math.max(delaySeconds, 0), MAX_DELAY_SECONDS) * 1000;
      setMessageDelay(delayMs);
    }

    // Set custom styles
    setCustomStyles(urlParams.styles);

    // Handle URL params (widget URL - takes priority)
    const hasUrlParams = (urlParams.twitchChannel && urlParams.twitchToken) || urlParams.kickChannel;

    if (hasUrlParams) {
      if (urlParams.twitchChannel && urlParams.twitchToken) {
        setTwitchChannel(urlParams.twitchChannel);
        setTwitchOauthToken(urlParams.twitchToken);
        if (urlParams.broadcasterId) setBroadcasterId(urlParams.broadcasterId);
        if (urlParams.clientId) setClientId(urlParams.clientId);

        localStorage.setItem('twitchToken', urlParams.twitchToken);
        localStorage.setItem('twitchChannelInfo', JSON.stringify({
          username: urlParams.twitchChannel,
          id: urlParams.broadcasterId,
          platform: 'twitch'
        }));

        if (urlParams.clientId) localStorage.setItem('twitchClientId', urlParams.clientId);
        if (urlParams.refreshToken) localStorage.setItem('twitchRefreshToken', urlParams.refreshToken);
        if (urlParams.expiresAt) localStorage.setItem('twitchTokenExpiresAt', urlParams.expiresAt);
      }

      if (urlParams.kickChannel) {
        setKickChannel(urlParams.kickChannel);
      }
      return;
    }

    // Check localStorage for saved auth
    const twitchToken = localStorage.getItem('twitchToken');
    const twitchChannelInfo = localStorage.getItem('twitchChannelInfo');
    const savedKickChannel = localStorage.getItem('kickChannel');

    if (twitchToken && twitchChannelInfo) {
      try {
        const validToken = await refreshTwitchTokenIfNeeded();
        if (validToken) {
          const channelInfo = JSON.parse(twitchChannelInfo);
          setTwitchOauthToken(validToken);
          setTwitchChannel(channelInfo.username);
        }
      } catch (e) {
        // Error parsing channel info
      }
    }

    if (savedKickChannel) {
      setKickChannel(savedKickChannel);
    }
  }, [refreshTwitchTokenIfNeeded]);

  // Message handling
  const getMessageKey = (message: ChatMessage): string => {
    return message.msgId || `${message.provider}-${message.userId}-${message.text}-${message.timestamp}`;
  };

  const cleanupProcessedIds = () => {
    if (processedMessageIdsRef.current.size > PROCESSED_MESSAGES_LIMIT) {
      const idsArray = Array.from(processedMessageIdsRef.current);
      processedMessageIdsRef.current.clear();
      idsArray.slice(-PROCESSED_MESSAGES_KEEP).forEach(id => processedMessageIdsRef.current.add(id));
    }
  };

  const hasPrivilegedBadge = (badges: ChatMessage['badges']): boolean => {
    return badges.some(badge => 
      PRIVILEGED_BADGES.includes(badge.type?.toLowerCase() || '')
    );
  };

  const addMessage = useCallback((message: ChatMessage) => {
    if (message.msgId) {
      pendingTimeoutsRef.current.delete(message.msgId);
    }

    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      return newMessages.length > config.messagesLimit
        ? newMessages.slice(-config.messagesLimit)
        : newMessages;
    });
  }, [config.messagesLimit]);

  const handleNewMessage = useCallback((message: ChatMessage) => {
    const messageKey = getMessageKey(message);

    // Deduplication check
    if (processedMessageIdsRef.current.has(messageKey)) return;

    processedMessageIdsRef.current.add(messageKey);
    cleanupProcessedIds();

    // Filter checks
    if (shouldHideMessage(message.text, config.hideCommands, config.ignoredUsers, message.displayName)) {
      return;
    }

    // Handle delay for non-privileged users
    const shouldDelay = !hasPrivilegedBadge(message.badges);
    
    if (shouldDelay) {
      const timeoutId = setTimeout(() => addMessage(message), messageDelay);
      if (message.msgId) {
        pendingTimeoutsRef.current.set(message.msgId, { timeout: timeoutId, message });
      }
    } else {
      addMessage(message);
    }
  }, [config.hideCommands, config.ignoredUsers, messageDelay, addMessage]);

  // Message removal
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
  }, []);

  const removeMessageByMsgId = useCallback((msgId: string) => {
    const pending = pendingTimeoutsRef.current.get(msgId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingTimeoutsRef.current.delete(msgId);
    }
    setMessages(prevMessages => prevMessages.filter(msg => msg.msgId !== msgId));
  }, []);

  const removeMessagesByUser = useCallback((username: string) => {
    const lowerUsername = username.toLowerCase();
    pendingTimeoutsRef.current.forEach((pending, msgId) => {
      if (pending.message.displayName.toLowerCase() === lowerUsername) {
        clearTimeout(pending.timeout);
        pendingTimeoutsRef.current.delete(msgId);
      }
    });
    setMessages(prevMessages =>
      prevMessages.filter(msg => msg.displayName.toLowerCase() !== lowerUsername)
    );
  }, []);

  // Scroll handling
  const scrollToBottom = useCallback(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight >= SCROLL_THRESHOLD);
  }, []);

  // Service management helpers
  const getTwitchUserInfo = useCallback(() => {
    const twitchUserInfo = localStorage.getItem('twitchUserInfo');
    let userInfo = null;

    if (twitchUserInfo) {
      try {
        userInfo = JSON.parse(twitchUserInfo);
      } catch (e) {
        // Error parsing
      }
    }

    if (broadcasterId && userInfo) {
      userInfo.broadcasterId = broadcasterId;
    } else if (broadcasterId && !userInfo) {
      userInfo = { broadcasterId };
    }

    return userInfo;
  }, [broadcasterId]);

  const createTwitchService = useCallback(() => {
    const twitchClientId = clientId || localStorage.getItem('twitchClientId') || undefined;
    const userInfo = getTwitchUserInfo();

    return new TwitchChatService(
      twitchChannel,
      handleNewMessage,
      {
        clientId: twitchClientId,
        oauthToken: twitchOauthToken || undefined,
        userInfo,
        onMessageDelete: removeMessageByMsgId,
        onUserBanned: removeMessagesByUser,
        onTokenRefresh: refreshTwitchTokenIfNeeded
      }
    );
  }, [twitchChannel, twitchOauthToken, clientId, handleNewMessage, removeMessageByMsgId, removeMessagesByUser, refreshTwitchTokenIfNeeded, getTwitchUserInfo]);

  const createKickService = useCallback(() => {
    return new KickChatService(
      kickChannel,
      handleNewMessage,
      {
        onMessageDelete: removeMessageByMsgId,
        onUserBanned: removeMessagesByUser
      }
    );
  }, [kickChannel, handleNewMessage, removeMessageByMsgId, removeMessagesByUser]);

  const manageService = useCallback((
    serviceRef: React.MutableRefObject<TwitchChatService | KickChatService | null>,
    channel: string,
    createService: () => TwitchChatService | KickChatService
  ) => {
    if (!channel) {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
      return () => {};
    }

    const oldService = serviceRef.current;
    if (oldService) {
      oldService.disconnect();
      serviceRef.current = null;

      const timeoutId = setTimeout(() => {
        const service = createService();
        service.connect();
        serviceRef.current = service as any;
      }, SERVICE_RECONNECT_DELAY_MS);

      return () => {
        clearTimeout(timeoutId);
        if (serviceRef.current) {
          serviceRef.current.disconnect();
          serviceRef.current = null;
        }
      };
    }

    const service = createService();
    service.connect();
    serviceRef.current = service as any;

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
    };
  }, []);

  // Effects
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!twitchOauthToken) return;
    const intervalId = setInterval(refreshTwitchTokenIfNeeded, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [twitchOauthToken, refreshTwitchTokenIfNeeded]);

  useEffect(() => {
    return manageService(twitchServiceRef as any, twitchChannel, createTwitchService);
  }, [twitchChannel, createTwitchService, manageService]);

  useEffect(() => {
    return manageService(kickServiceRef as any, kickChannel, createKickService);
  }, [kickChannel, createKickService, manageService]);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;

    if (isNearBottom) {
      setTimeout(scrollToBottom, 0);
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach(({ timeout }) => clearTimeout(timeout));
      pendingTimeoutsRef.current.clear();
      twitchServiceRef.current?.disconnect();
      kickServiceRef.current?.disconnect();
    };
  }, []);

  return {
    messages,
    config,
    showScrollButton,
    chatContainerRef,
    removeMessage,
    scrollToBottom,
    handleScroll,
    customStyles
  };
};
