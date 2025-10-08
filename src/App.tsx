import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConfig } from './types';
import { TwitchChatService } from './services/TwitchChat';
import { KickChatService } from './services/KickChat';
import { MessageRow } from './components/MessageRow';
import { shouldHideMessage } from './utils/messageUtils';
import AuthService from './services/AuthService';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Check for OAuth redirect and restore authentication state
  useEffect(() => {
    const initAuth = async () => {
      // Check if we're returning from OAuth redirect (code flow)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // OAuth code flow - let Login component handle it
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      // Check for existing authentication from localStorage
      const twitchToken = localStorage.getItem('twitchToken');
      const kickToken = localStorage.getItem('kickToken');
      const twitchChannelInfo = localStorage.getItem('twitchChannelInfo');
      const kickChannelInfo = localStorage.getItem('kickChannelInfo');

      if (twitchToken && twitchChannelInfo) {
        try {
          const channelInfo = JSON.parse(twitchChannelInfo);
          setTwitchOauthToken(twitchToken);
          setTwitchChannel(channelInfo.username);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Error parsing Twitch channel info:', e);
        }
      } else if (kickToken && kickChannelInfo) {
        try {
          const channelInfo = JSON.parse(kickChannelInfo);
          setKickChannel(channelInfo.username);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Error parsing Kick channel info:', e);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Initialize Cloudflare beacon
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015';
    script.setAttribute('data-cf-beacon', JSON.stringify({
      token: 'vcd15cbe7772f49c399c6a5babf22c1241717689176015',
      spa: true
    }));
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
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


  // Handle logout
  const handleLogout = () => {
    // Disconnect services
    if (twitchService) {
      twitchService.disconnect();
      setTwitchService(null);
    }
    if (kickService) {
      kickService.disconnect();
      setKickService(null);
    }

    // Clear state
    AuthService.logout();
    setIsAuthenticated(false);
    setTwitchChannel('');
    setKickChannel('');
    setTwitchOauthToken('');
    setMessages([]);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#667eea'
      }}>
        Carregando...
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return
  }

  // Show chat interface
  return (
    <div className="chat-container">
      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#5568d3';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#667eea';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Sair
      </button>

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
