import React, { useState, useEffect } from 'react';
import './Login.css';
import OAuthService from './services/OAuthService';

interface LoginProps {
  onLogin?: (twitchToken: string, twitchChannel: string, kickChannel?: string) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [isLoadingTwitch, setIsLoadingTwitch] = useState(false);
  const [isLoadingKick, setIsLoadingKick] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedPlatform, setAuthenticatedPlatform] = useState<'twitch' | 'kick' | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [widgetUrl, setWidgetUrl] = useState('');

  // Check for OAuth callback and existing authentication
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        setError(`Erro de autenticação: ${error}`);
        return;
      }

      if (code && state) {
        // Determine platform based on stored state
        const twitchState = localStorage.getItem('twitch_oauth_state');
        const kickState = localStorage.getItem('kick_oauth_state');

        let platform: 'twitch' | 'kick' | null = null;
        if (state === twitchState) {
          platform = 'twitch';
          setIsLoadingTwitch(true);
        } else if (state === kickState) {
          platform = 'kick';
          setIsLoadingKick(true);
        }

        if (platform) {
          try {
            // Exchange code for token
            const tokenResponse = await OAuthService.handleOAuthCallback(platform, code, state);

            // Get user info
            const userData = platform === 'twitch'
              ? await OAuthService.getTwitchUserInfo(tokenResponse.access_token)
              : await OAuthService.getKickUserInfo(tokenResponse.access_token);

            // Store tokens and user info
            localStorage.setItem(`${platform}Token`, tokenResponse.access_token);
            localStorage.setItem(`${platform}UserInfo`, JSON.stringify(userData));

            if (tokenResponse.refresh_token) {
              localStorage.setItem(`${platform}RefreshToken`, tokenResponse.refresh_token);
            }

            // Generate widget URL
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
            const channelParam = platform === 'twitch' ? 'twitchChannel' : 'kickChannel';
            const tokenParam = platform === 'twitch' ? 'twitchToken' : 'kickToken';
            const widget = `${baseUrl}?${channelParam}=${userData.username}&${tokenParam}=${tokenResponse.access_token}`;

            setUserInfo(userData);
            setAuthenticatedPlatform(platform);
            setWidgetUrl(widget);
            setIsAuthenticated(true);

            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);

          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao processar autenticação');
          } finally {
            setIsLoadingTwitch(false);
            setIsLoadingKick(false);
          }
        }
      } else {
        // Check for existing authentication
        const twitchToken = localStorage.getItem('twitchToken');
        const kickToken = localStorage.getItem('kickToken');
        const twitchUser = localStorage.getItem('twitchUserInfo');
        const kickUser = localStorage.getItem('kickUserInfo');

        if (twitchToken && twitchUser) {
          const userData = JSON.parse(twitchUser);
          const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
          const widget = `${baseUrl}?twitchChannel=${userData.username}&twitchToken=${twitchToken}`;

          setUserInfo(userData);
          setAuthenticatedPlatform('twitch');
          setWidgetUrl(widget);
          setIsAuthenticated(true);
        } else if (kickToken && kickUser) {
          const userData = JSON.parse(kickUser);
          const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
          const widget = `${baseUrl}?kickChannel=${userData.username}&kickToken=${kickToken}`;

          setUserInfo(userData);
          setAuthenticatedPlatform('kick');
          setWidgetUrl(widget);
          setIsAuthenticated(true);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleTwitchOAuth = async () => {
    setIsLoadingTwitch(true);
    setError('');

    try {
      await OAuthService.initiateTwitchOAuth();
    } catch (error) {
      setError('Erro ao iniciar autenticação com Twitch');
      setIsLoadingTwitch(false);
    }
  };


  const handleKickOAuth = async () => {
    setIsLoadingKick(true);
    setError('');

    try {
      await OAuthService.initiateKickOAuth();
    } catch (error) {
      setError('Erro ao iniciar autenticação com Kick');
      setIsLoadingKick(false);
    }
  };

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(widgetUrl).then(() => {
      alert('URL copiada para a área de transferência!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = widgetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copiada para a área de transferência!');
    });
  };

  const goToChat = () => {
    window.location.href = widgetUrl;
  };

  const logout = () => {
    // Clear all stored data
    localStorage.removeItem(`${authenticatedPlatform}Token`);
    localStorage.removeItem(`${authenticatedPlatform}UserInfo`);
    localStorage.removeItem(`${authenticatedPlatform}RefreshToken`);
    localStorage.removeItem(`${authenticatedPlatform}_oauth_state`);
    localStorage.removeItem(`${authenticatedPlatform}_code_verifier`);

    // Reset state
    setIsAuthenticated(false);
    setAuthenticatedPlatform(null);
    setUserInfo(null);
    setWidgetUrl('');
    setError('');
  };


  // Show widget URL if authenticated
  if (isAuthenticated && userInfo) {
    const platformName = authenticatedPlatform === 'twitch' ? 'Twitch' : 'Kick';
    const platformColor = authenticatedPlatform === 'twitch' ? '#9146ff' : '#53fc18';
    const platformEmoji = authenticatedPlatform === 'twitch' ? '🎮' : '⚡';

    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">MultiStream Chat</h1>

          <div className="widget-url-section">
            <div className="widget-url-container" style={{ borderColor: platformColor }}>
              <h3 style={{ color: platformColor }}>
                {platformEmoji} Conectado ao {platformName}!
              </h3>

              <div style={{
                margin: '20px 0',
                padding: '15px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Usuário:</p>
                <p style={{ margin: '0', fontSize: '1.2rem' }}>{userInfo.displayName || userInfo.username}</p>
              </div>

              <p style={{ margin: '20px 0 10px 0' }}>Use esta URL para ver o chat:</p>
              <div className="url-input-container">
                <input
                  type="text"
                  value={widgetUrl}
                  readOnly
                  className="widget-url-input"
                />
                <button onClick={copyWidgetUrl} className="copy-button">
                  Copiar
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={goToChat} className="go-to-chat-button" style={{ flex: 1 }}>
                  Ir para o Chat
                </button>
                <button
                  onClick={logout}
                  className="oauth-button"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                    border: 'none'
                  }}
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login buttons
  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">MultiStream Chat</h1>
        <p className="login-subtitle">Conecte-se aos chats da Twitch e Kick</p>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}

        <div className="login-form">
          <div className="platform-section">
            {/* Twitch Section */}
            <div style={{ marginBottom: '20px' }}>
              <button
                className="oauth-button twitch-button"
                onClick={handleTwitchOAuth}
                disabled={isLoadingTwitch}
                style={{ marginBottom: '15px', width: '100%' }}
              >
                <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                </svg>
                {isLoadingTwitch ? 'Carregando...' : 'Login Twitch'}
              </button>
            </div>

            {/* Kick Section */}
            <div>
              <button
                className="oauth-button kick-button"
                onClick={handleKickOAuth}
                disabled={isLoadingKick}
                style={{ marginBottom: '15px', width: '100%' }}
              >
                <svg className="button-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M37 .036h164.448v113.621h54.71v-56.82h54.731V.036h164.448v170.777h-54.73v56.82h-54.711v56.8h54.71v56.82h54.73V512.03H310.89v-56.82h-54.73v-56.8h-54.711v113.62H37V.036z" />
                </svg>
                {isLoadingKick ? 'Carregando...' : 'Login Kick'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

