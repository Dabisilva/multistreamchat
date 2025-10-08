import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConfig } from './types';
import { TwitchChatService } from './services/TwitchChat';
import { KickChatService } from './services/KickChat';
import { MessageRow } from './components/MessageRow';
import { shouldHideMessage } from './utils/messageUtils';
import './style.css';

const App: React.FC = () => {
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
        console.error('Error parsing Twitch channel info:', e);
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
      const service = new TwitchChatService(
        twitchChannel,
        handleNewMessage,
        twitchOauthToken ? { oauthToken: twitchOauthToken } : undefined
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
    <div className="chat-container">
      <div
        className="chat-box"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* Chat Messages */}
        <div className={`main-container ${config.alignMessages === 'block' ? 'block-align' : 'bottom-align'}`}>
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
            className="scroll-to-bottom-btn"
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

export default App;
