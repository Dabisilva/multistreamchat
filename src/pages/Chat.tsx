import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConfig } from '../types';
import { TwitchChatService } from '../services/TwitchChat';
import { KickChatService } from '../services/KickChat';
import { MessageRow } from '../components/MessageRow';
import { shouldHideMessage } from '../utils/messageUtils';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config] = useState<ChatConfig>({
    hideAfter: 60,
    messagesLimit: 50,
    nickColor: 'user',
    customNickColor: '#ffffff',
    hideCommands: true,
    ignoredUsers: ['streamelements', '@streamelements'],
    alignMessages: 'bottom'
  });

  const [twitchChannel, setTwitchChannel] = useState<string>('');
  const [kickChannel, setKickChannel] = useState<string>('');
  const [twitchOauthToken, setTwitchOauthToken] = useState<string>('');
  const [twitchService, setTwitchService] = useState<TwitchChatService | null>(null);
  const [kickService, setKickService] = useState<KickChatService | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize authentication from URL params or localStorage
  const initAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for widget URL parameters (direct chat access)
    const twitchChannelParam = urlParams.get('twitchChannel');
    const twitchTokenParam = urlParams.get('twitchToken');
    const kickChannelParam = urlParams.get('kickChannel');

    // If we have URL params, use them (widget URL - takes priority)
    const hasUrlParams = (twitchChannelParam && twitchTokenParam) || kickChannelParam;

    if (hasUrlParams) {
      // Initialize Twitch from URL params
      if (twitchChannelParam && twitchTokenParam) {
        setTwitchChannel(twitchChannelParam);
        setTwitchOauthToken(twitchTokenParam);
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
        const channelInfo = JSON.parse(twitchChannelInfo);
        setTwitchOauthToken(twitchToken);
        setTwitchChannel(channelInfo.username);
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

    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];

      // Remove old messages if limit is exceeded
      if (newMessages.length > config.messagesLimit) {
        return newMessages.slice(-config.messagesLimit);
      }

      return newMessages;
    });
  }, [config.hideCommands, config.ignoredUsers, config.messagesLimit]);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.filter(msg => msg.id !== messageId)
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
      // Get user info and client ID from localStorage
      const twitchUserInfo = localStorage.getItem('twitchUserInfo');
      const twitchClientId = localStorage.getItem('twitchClientId');
      let userInfo = null;

      if (twitchUserInfo) {
        try {
          userInfo = JSON.parse(twitchUserInfo);
        } catch (e) {
          // Error parsing user info
        }
      }

      const service = new TwitchChatService(
        twitchChannel,
        handleNewMessage,
        {
          clientId: twitchClientId || undefined, // ⭐ Use the same client ID
          oauthToken: twitchOauthToken || undefined,
          userInfo: userInfo
        }
      );
      service.connect();
      setTwitchService(service);
    }
  }, [twitchChannel, twitchService, twitchOauthToken, handleNewMessage]);

  useEffect(() => {
    if (kickChannel && !kickService) {
      const service = new KickChatService(kickChannel, handleNewMessage);
      service.connect();
      setKickService(service);
    }
  }, [kickChannel, kickService, handleNewMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
        className="flex flex-col h-screen p-2.5 overflow-y-auto relative"
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
