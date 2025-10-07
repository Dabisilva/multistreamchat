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
    animationIn: 'none',
    animationOut: 'none',
    hideAfter: 60,
    messagesLimit: 50,
    nickColor: 'user',
    customNickColor: '#ffffff',
    hideCommands: false,
    ignoredUsers: ['streamelements'],
    alignMessages: 'bottom'
  });

  const [twitchChannel, setTwitchChannel] = useState<string>('');
  const [kickChannel, setKickChannel] = useState<string>('');
  const [twitchService, setTwitchService] = useState<TwitchChatService | null>(null);
  const [kickService, setKickService] = useState<KickChatService | null>(null);

  // Parse URL parameters for channel names and auto-connect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twitchParam = urlParams.get('twitchChannel');
    const kickParam = urlParams.get('kickChannel');

    if (twitchParam) {
      setTwitchChannel(twitchParam);
    }
    if (kickParam) {
      setKickChannel(kickParam);
    }
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

  // Auto-connect when channels are available
  useEffect(() => {
    if (twitchChannel && !twitchService) {
      const service = new TwitchChatService(twitchChannel, handleNewMessage);
      service.connect();
      setTwitchService(service);
    }
  }, [twitchChannel, twitchService, handleNewMessage]);

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

  return (
    <div className="chat-container">
      <div className="chat-box">
        {/* Status Display */}
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '5px',
          color: 'white',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Twitch:</strong> {twitchChannel}
            {twitchService && twitchService.isConnected() ? (
              <span style={{ color: '#00ff00', marginLeft: '5px' }}>● Connected</span>
            ) : (
              <span style={{ color: '#ff0000', marginLeft: '5px' }}>● Disconnected</span>
            )}
          </div>
          <div>
            <strong>Kick:</strong> {kickChannel}
            {kickService && kickService.isConnected() ? (
              <span style={{ color: '#00ff00', marginLeft: '5px' }}>● Connected</span>
            ) : (
              <span style={{ color: '#ff0000', marginLeft: '5px' }}>● Disconnected</span>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className={`main-container ${config.alignMessages === 'block' ? 'block-align' : 'bottom-align'}`}>
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              animationIn={config.animationIn}
              animationOut={config.animationOut}
              hideAfter={config.hideAfter}
              onRemove={removeMessage}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
