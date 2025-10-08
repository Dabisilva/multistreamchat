import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConfig } from './types';
import { TwitchChatService } from './services/TwitchChat';
import { KickChatService } from './services/KickChat';
import { MessageRow } from './components/MessageRow';
import { shouldHideMessage } from './utils/messageUtils';
import { Login } from './components/Login';
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
      // Check if we're returning from OAuth redirect
      const { token, error } = AuthService.parseOAuthFromUrl();

      if (error) {
        console.error('OAuth error:', error);
        alert(`Authentication failed: ${error}`);
        setIsLoading(false);
        return;
      }

      if (token) {
        // We have a token from OAuth redirect
        // Get the channel names from sessionStorage
        const savedTwitchChannel = sessionStorage.getItem('twitchChannel') || '';
        const savedKickChannel = sessionStorage.getItem('kickChannel') || '';

        if (savedTwitchChannel) {
          // Save auth and connect
          AuthService.saveAuth(token, savedTwitchChannel, savedKickChannel);
          setTwitchOauthToken(token);
          setTwitchChannel(savedTwitchChannel);
          if (savedKickChannel) {
            setKickChannel(savedKickChannel);
          }
          setIsAuthenticated(true);
        }
      } else {
        // Check for existing authentication
        const authState = AuthService.getAuthState();
        if (authState.isAuthenticated) {
          setTwitchOauthToken(authState.twitchToken);
          setTwitchChannel(authState.twitchChannel);
          if (authState.kickChannel) {
            setKickChannel(authState.kickChannel);
          }
          setIsAuthenticated(true);
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

  // Handle login
  const handleLogin = (token: string, twitch: string, kick?: string) => {
    AuthService.saveAuth(token, twitch, kick);
    setTwitchOauthToken(token);
    setTwitchChannel(twitch);
    if (kick) {
      setKickChannel(kick);
    }
    setIsAuthenticated(true);
  };

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
    return <Login onLogin={handleLogin} />;
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
