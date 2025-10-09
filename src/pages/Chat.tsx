import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConfig } from '../types';
import { TwitchChatService } from '../services/TwitchChat';
import { KickChatService } from '../services/KickChat';
import { MessageRow } from '../components/MessageRow';
import { shouldHideMessage } from '../utils/messageUtils';
import OAuthService from '../services/OAuthService';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config] = useState<ChatConfig>({
    hideAfter: 180,
    messagesLimit: 20,
    nickColor: 'user',
    customNickColor: '#ffffff',
    hideCommands: true,
    ignoredUsers: ['streamelements', '@streamelements'],
    alignMessages: 'bottom'
  });

  const [twitchChannel, setTwitchChannel] = useState<string>('');
  const [kickChannel, setKickChannel] = useState<string>('');
  const [twitchOauthToken, setTwitchOauthToken] = useState<string>('');
  const [broadcasterId, setBroadcasterId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [twitchService, setTwitchService] = useState<TwitchChatService | null>(null);
  const [kickService, setKickService] = useState<KickChatService | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const pendingTimeoutsRef = React.useRef<Map<string, { timeout: NodeJS.Timeout; message: ChatMessage }>>(new Map());

  // Customization options from URL
  const [customStyles, setCustomStyles] = useState({
    usernameBg: '#30034d',
    messageBg: '#8b5cf6',
    messageColor: '#ffffff',
    borderRadius: '10',
    usernameFontSize: '20',
    messageFontSize: '20',
    messagePadding: '0'
  });

  // Message delay in milliseconds (default 5s, max 6s)
  const [messageDelay, setMessageDelay] = useState<number>(5000);

  // Refresh Twitch token if expired or about to expire
  const refreshTwitchTokenIfNeeded = useCallback(async (): Promise<string | null> => {
    const twitchToken = localStorage.getItem('twitchToken');
    const refreshToken = localStorage.getItem('twitchRefreshToken');
    const expiresAt = localStorage.getItem('twitchTokenExpiresAt');

    if (!twitchToken || !refreshToken) {
      return null;
    }

    // Check if token expires within the next 10 minutes (600000 ms)
    const shouldRefresh = !expiresAt || (parseInt(expiresAt) - Date.now()) < 600000;

    if (shouldRefresh) {
      try {
        console.log('🔄 Refreshing Twitch token in chat...');
        const tokenResponse = await OAuthService.refreshTwitchToken(refreshToken);

        // Calculate new expiration time
        const newExpiresAt = Date.now() + (tokenResponse.expires_in * 1000);

        // Update stored tokens
        localStorage.setItem('twitchToken', tokenResponse.access_token);
        localStorage.setItem('twitchTokenExpiresAt', newExpiresAt.toString());

        if (tokenResponse.refresh_token) {
          localStorage.setItem('twitchRefreshToken', tokenResponse.refresh_token);
        }

        console.log('✅ Twitch token refreshed successfully in chat');

        // Update the token in state to trigger reconnection
        setTwitchOauthToken(tokenResponse.access_token);

        return tokenResponse.access_token;
      } catch (err) {
        console.error('❌ Failed to refresh Twitch token in chat:', err);
        return null;
      }
    }

    return twitchToken;
  }, []);

  // Initialize authentication from URL params or localStorage
  const initAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for widget URL parameters (direct chat access)
    const twitchChannelParam = urlParams.get('twitchChannel');
    const twitchTokenParam = urlParams.get('twitchToken');
    const broadcasterIdParam = urlParams.get('broadcasterId');
    const clientIdParam = urlParams.get('clientId');
    const kickChannelParam = urlParams.get('kickChannel');

    // Get customization parameters
    const usernameBg = urlParams.get('usernameBg') || '#30034d';
    const messageBg = urlParams.get('messageBg') || '#8b5cf6';
    const messageColor = urlParams.get('messageColor') || '#ffffff';
    const borderRadius = urlParams.get('borderRadius') || '10';
    const usernameFontSize = urlParams.get('usernameFontSize') || '20';
    const messageFontSize = urlParams.get('messageFontSize') || '20';
    const messagePadding = urlParams.get('messagePadding') || '0';

    // Get message delay parameter (in seconds, default 5, max 6)
    const delayParam = urlParams.get('messageDelay');
    if (delayParam) {
      const delayInSeconds = parseFloat(delayParam);
      // Clamp between 0 and 6 seconds, convert to milliseconds
      const delayInMs = Math.min(Math.max(delayInSeconds, 0), 6) * 1000;
      setMessageDelay(delayInMs);
    }

    // Set custom styles
    setCustomStyles({
      usernameBg,
      messageBg,
      messageColor,
      borderRadius,
      usernameFontSize,
      messageFontSize,
      messagePadding
    });

    // If we have URL params, use them (widget URL - takes priority)
    const hasUrlParams = (twitchChannelParam && twitchTokenParam) || kickChannelParam;

    if (hasUrlParams) {
      // Initialize Twitch from URL params
      if (twitchChannelParam && twitchTokenParam) {
        setTwitchChannel(twitchChannelParam);
        setTwitchOauthToken(twitchTokenParam);
        if (broadcasterIdParam) setBroadcasterId(broadcasterIdParam);
        if (clientIdParam) setClientId(clientIdParam);
      }

      // Initialize Kick from URL params (no OAuth needed)
      if (kickChannelParam) {
        setKickChannel(kickChannelParam);
      }

      return; // Don't check localStorage if URL params exist
    }

    // No URL params - check for existing authentication from localStorage
    const twitchToken = localStorage.getItem('twitchToken');
    const twitchChannelInfo = localStorage.getItem('twitchChannelInfo');
    const savedKickChannel = localStorage.getItem('kickChannel');

    if (twitchToken && twitchChannelInfo) {
      try {
        // Validate and refresh token if needed
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

    // Load saved Kick channel if exists
    if (savedKickChannel) {
      setKickChannel(savedKickChannel);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  // Set up periodic token refresh check (every 5 minutes)
  useEffect(() => {
    if (!twitchOauthToken) return;

    const intervalId = setInterval(async () => {
      await refreshTwitchTokenIfNeeded();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [twitchOauthToken, refreshTwitchTokenIfNeeded]);


  const handleNewMessage = useCallback((message: ChatMessage) => {
    // Check if message should be hidden
    if (shouldHideMessage(
      message.text,
      config.hideCommands,
      config.ignoredUsers,
      message.displayName
    )) {
      return;
    }

    // Check if user is a moderator, VIP, broadcaster, or OG
    // Note: Kick and Twitch use different badge names
    const hasPrivilegedBadge = message.badges.some(badge => {
      const badgeType = badge.type?.toLowerCase() || '';
      return (
        badgeType === 'moderator' ||
        badgeType === 'vip' ||
        badgeType === 'broadcaster' ||
        badgeType === 'owner' || // Kick channel owner
        badgeType === 'og' || // Kick OG badge
        badgeType === 'staff' || // Platform staff
        badgeType === 'super_admin' // Kick super admin
      );
    });

    const addMessage = () => {
      // Remove from pending timeouts if it was delayed
      if (message.msgId) {
        pendingTimeoutsRef.current.delete(message.msgId);
      }

      setMessages(prevMessages => {
        const newMessages = [...prevMessages, message];

        // Remove old messages if limit is exceeded
        if (newMessages.length > config.messagesLimit) {
          return newMessages.slice(-config.messagesLimit);
        }

        return newMessages;
      });
    };

    // If user has a privileged badge, show message immediately
    // Otherwise, delay by the configured amount
    if (hasPrivilegedBadge) {
      addMessage();
    } else {
      const timeoutId = setTimeout(addMessage, messageDelay);
      // Track the timeout and message so we can cancel it if message is deleted or user is banned
      if (message.msgId) {
        pendingTimeoutsRef.current.set(message.msgId, { timeout: timeoutId, message });
      }
    }
  }, [config.hideCommands, config.ignoredUsers, config.messagesLimit, messageDelay]);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.filter(msg => msg.id !== messageId)
    );
  }, []);

  const removeMessageByMsgId = useCallback((msgId: string) => {
    // Cancel pending timeout if message is waiting to be displayed
    const pending = pendingTimeoutsRef.current.get(msgId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingTimeoutsRef.current.delete(msgId);
    }

    setMessages(prevMessages =>
      prevMessages.filter(msg => msg.msgId !== msgId)
    );
  }, []);

  const removeMessagesByUser = useCallback((username: string) => {
    // Cancel all pending timeouts for messages from this user
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

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle scroll events to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          scrollToBottom();
        }, 0);
      }
    }
  }, [messages, scrollToBottom]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

  // Auto-connect when channels are available
  useEffect(() => {
    if (twitchChannel && !twitchService) {
      // Get user info and client ID from localStorage or URL params
      const twitchUserInfo = localStorage.getItem('twitchUserInfo');
      const twitchClientId = clientId || localStorage.getItem('twitchClientId');
      let userInfo = null;

      if (twitchUserInfo) {
        try {
          userInfo = JSON.parse(twitchUserInfo);
        } catch (e) {
          // Error parsing user info
        }
      }

      // If broadcasterId from URL, use it to override userInfo
      if (broadcasterId && userInfo) {
        userInfo.broadcasterId = broadcasterId;
      } else if (broadcasterId && !userInfo) {
        userInfo = { broadcasterId };
      }

      const service = new TwitchChatService(
        twitchChannel,
        handleNewMessage,
        {
          clientId: twitchClientId || undefined,
          oauthToken: twitchOauthToken || undefined,
          userInfo: userInfo,
          onMessageDelete: removeMessageByMsgId,
          onUserBanned: removeMessagesByUser
        }
      );
      service.connect();
      setTwitchService(service);
    }
  }, [twitchChannel, twitchService, twitchOauthToken, broadcasterId, clientId, handleNewMessage, removeMessageByMsgId, removeMessagesByUser]);

  useEffect(() => {
    if (kickChannel && !kickService) {
      const service = new KickChatService(
        kickChannel,
        handleNewMessage,
        {
          onMessageDelete: removeMessageByMsgId,
          onUserBanned: removeMessagesByUser
        }
      );
      service.connect();
      setKickService(service);
    }
  }, [kickChannel, kickService, handleNewMessage, removeMessageByMsgId, removeMessagesByUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      pendingTimeoutsRef.current.forEach((pending) => {
        clearTimeout(pending.timeout);
      });
      pendingTimeoutsRef.current.clear();

      if (twitchService) {
        twitchService.disconnect();
      }
      if (kickService) {
        kickService.disconnect();
      }
    };
  }, []); // Remove service dependencies to prevent cleanup on service changes

  // Show chat interface
  return (
    <div className="h-screen flex flex-col bg-transparent">
      <div
        className="flex flex-col h-full p-2.5 overflow-y-auto relative"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* Chat Messages */}
        <div className={`flex flex-col min-h-full ${config.alignMessages === 'block' ? 'justify-start' : 'justify-end flex-grow'}`}>
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              hideAfter={config.hideAfter}
              onRemove={removeMessage}
              customStyles={customStyles}
            />
          ))}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            className="fixed bottom-5 right-5 w-[50px] h-[50px] rounded-full bg-purple-500 text-white border-0 text-xl font-bold cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 z-[1000] flex items-center justify-center hover:bg-purple-700 hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:scale-95"
            onClick={scrollToBottom}
            title="Rolar para o final"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
};

export default Chat;
