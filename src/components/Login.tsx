import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (twitchToken: string, twitchChannel: string, kickChannel?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [twitchChannel, setTwitchChannel] = useState('');
  const [kickChannel, setKickChannel] = useState('');
  const [twitchToken, setTwitchToken] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);

  // Twitch OAuth Configuration
  const TWITCH_CLIENT_ID = 'arryx6wxz5asg8eaneg16j0emyp3of'; // You should replace this with your own Client ID
  const REDIRECT_URI = window.location.origin + window.location.pathname;
  const SCOPES = 'user:read:email chat:read';

  const handleTwitchOAuth = () => {
    if (!twitchChannel) {
      alert('Por favor, insira o nome do canal da Twitch primeiro');
      return;
    }

    // Store channel names in sessionStorage to retrieve after redirect
    sessionStorage.setItem('twitchChannel', twitchChannel);
    if (kickChannel) {
      sessionStorage.setItem('kickChannel', kickChannel);
    }

    // Redirect to Twitch OAuth
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
  };

  const handleManualLogin = () => {
    if (!twitchChannel) {
      alert('Por favor, insira o nome do canal da Twitch');
      return;
    }

    if (!twitchToken) {
      alert('Por favor, insira o token OAuth da Twitch');
      return;
    }

    // Store credentials in localStorage
    localStorage.setItem('twitchToken', twitchToken);
    localStorage.setItem('twitchChannel', twitchChannel);
    if (kickChannel) {
      localStorage.setItem('kickChannel', kickChannel);
    }

    onLogin(twitchToken, twitchChannel, kickChannel);
  };

  const handleKickLogin = () => {
    if (!kickChannel) {
      alert('Por favor, insira o nome do canal da Kick');
      return;
    }

    // For now, Kick doesn't require OAuth for basic chat reading
    // Store the channel and proceed
    localStorage.setItem('kickChannel', kickChannel);

    // If we have Twitch credentials, use them; otherwise, just connect to Kick
    const storedTwitchToken = localStorage.getItem('twitchToken') || '';
    const storedTwitchChannel = localStorage.getItem('twitchChannel') || '';

    onLogin(storedTwitchToken, storedTwitchChannel, kickChannel);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">MultiStream Chat</h1>
        <p className="login-subtitle">Conecte-se aos chats da Twitch e Kick</p>

        <div className="login-form">
          <div className="platform-section">
            <button className="oauth-button twitch-button" onClick={handleTwitchOAuth}>
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Conectar Twitch
            </button>
            <button className="oauth-button kick-button" onClick={handleKickLogin}>
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Conectar Kick
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

