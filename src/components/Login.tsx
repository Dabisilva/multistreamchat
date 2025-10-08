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
  const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // You should replace this with your own Client ID
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
          {/* Twitch Section */}
          <div className="platform-section twitch-section">
            <div className="platform-header">
              <svg className="platform-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
              </svg>
              <h2>Twitch</h2>
            </div>

            <div className="input-group">
              <label htmlFor="twitch-channel">Nome do Canal</label>
              <input
                id="twitch-channel"
                type="text"
                placeholder="Digite o nome do canal da Twitch"
                value={twitchChannel}
                onChange={(e) => setTwitchChannel(e.target.value.toLowerCase())}
              />
            </div>

            <button className="oauth-button twitch-button" onClick={handleTwitchOAuth}>
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Entrar com OAuth da Twitch
            </button>

            <div className="manual-token-section">
              <button
                className="toggle-manual-button"
                onClick={() => setShowManualToken(!showManualToken)}
              >
                {showManualToken ? '▼' : '►'} Usar token manual
              </button>

              {showManualToken && (
                <div className="manual-token-inputs">
                  <div className="input-group">
                    <label htmlFor="twitch-token">Token OAuth</label>
                    <input
                      id="twitch-token"
                      type="password"
                      placeholder="oauth:seu_token_aqui"
                      value={twitchToken}
                      onChange={(e) => setTwitchToken(e.target.value)}
                    />
                  </div>
                  <button className="manual-button" onClick={handleManualLogin}>
                    Conectar com Token Manual
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Kick Section */}
          <div className="platform-section kick-section">
            <div className="platform-header">
              <svg className="platform-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" />
              </svg>
              <h2>Kick</h2>
            </div>

            <div className="input-group">
              <label htmlFor="kick-channel">Nome do Canal</label>
              <input
                id="kick-channel"
                type="text"
                placeholder="Digite o nome do canal da Kick"
                value={kickChannel}
                onChange={(e) => setKickChannel(e.target.value.toLowerCase())}
              />
            </div>

            <button className="oauth-button kick-button" onClick={handleKickLogin}>
              <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Conectar à Kick
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

