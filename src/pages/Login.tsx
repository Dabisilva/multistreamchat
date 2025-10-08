import React, { useState, useEffect, useCallback } from 'react';
import './Login.css';
import OAuthService from '../services/OAuthService';

const baseUrl = window.location.origin;
interface LoginProps {
  onLogin?: (twitchToken: string, twitchChannel: string, kickChannel?: string) => void;
}

const Login: React.FC<LoginProps> = () => {
  const [isLoadingTwitch, setIsLoadingTwitch] = useState(false);
  const [isLoadingKick, setIsLoadingKick] = useState(false);
  const [_, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedPlatform, setAuthenticatedPlatform] = useState<'twitch' | 'kick' | null>(null);
  const [widgetUrl, setWidgetUrl] = useState('');

  // Process OAuth callback
  const processOAuthCallback = useCallback(async (code: string, state: string, platform: 'twitch' | 'kick') => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback(platform, code, state);
      console.log(tokenResponse);
      const userData = platform === 'twitch'
        ? await OAuthService.getTwitchUserInfo(tokenResponse.access_token)
        : await OAuthService.getKickUserInfo(tokenResponse.access_token);

      // Store tokens and user info
      localStorage.setItem(`${platform}Token`, tokenResponse.access_token);
      localStorage.setItem(`${platform}UserInfo`, JSON.stringify(userData));
      localStorage.setItem(`${platform}ChannelInfo`, JSON.stringify({
        username: userData.username,
        displayName: userData.displayName,
        id: userData.id,
        platform: platform
      }));

      if (tokenResponse.refresh_token) {
        localStorage.setItem(`${platform}RefreshToken`, tokenResponse.refresh_token);
      }

      // Generate widget URL with parameters
      const channelParam = platform === 'twitch' ? 'twitchChannel' : 'kickChannel';
      const tokenParam = platform === 'twitch' ? 'twitchToken' : 'kickToken';
      const widget = `${baseUrl}/?${channelParam}=${userData.username}&${tokenParam}=${tokenResponse.access_token}`;

      setAuthenticatedPlatform(platform);
      setWidgetUrl(widget);
      setIsAuthenticated(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar autenticação');
      setIsAuthenticated(false);
      throw err;
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      // Check for existing auth first
      const twitchToken = localStorage.getItem('twitchToken');
      const kickToken = localStorage.getItem('kickToken');
      const twitchUser = localStorage.getItem('twitchUserInfo');
      const kickUser = localStorage.getItem('kickUserInfo');

      if (twitchToken && twitchUser) {
        const userData = JSON.parse(twitchUser);
        const widget = `${baseUrl}/?twitchChannel=${userData.username}&twitchToken=${twitchToken}`;
        setAuthenticatedPlatform('twitch');
        setWidgetUrl(widget);
        setIsAuthenticated(true);
        return;
      }

      if (kickToken && kickUser) {
        const userData = JSON.parse(kickUser);
        const widget = `${baseUrl}/?kickChannel=${userData.username}&kickToken=${kickToken}`;
        setAuthenticatedPlatform('kick');
        setWidgetUrl(widget);
        setIsAuthenticated(true);
        return;
      }

      // Check for OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const urlError = urlParams.get('error');

      if (urlError) {
        setError(`Erro de autenticação: ${urlError}`);
        return;
      }

      if (code && state) {
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
            await processOAuthCallback(code, state, platform);
          } catch (err) {
            // Error already handled in processOAuthCallback
          } finally {
            setIsLoadingTwitch(false);
            setIsLoadingKick(false);
          }
        } else {
          setError('Estado de autenticação inválido. Por favor, tente novamente.');
        }
      }
    };

    init();
  }, []); // Empty dependency array - only run once on mount

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
      setError(error instanceof Error ? error.message : 'Erro ao iniciar autenticação com Kick');
      setIsLoadingKick(false);
    }
  };

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(widgetUrl).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = widgetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  const goToChat = () => {
    window.open(widgetUrl, '_blank')?.focus();
  };

  const twitchButtonText = () => {
    return isLoadingTwitch
      ? 'Carregando...'
      : (isAuthenticated && authenticatedPlatform === 'twitch')
        ? 'Conectado'
        : 'Login Twitch'
  };

  const kickButtonText = () => {
    return isLoadingKick
      ? 'Carregando...'
      : (isAuthenticated && authenticatedPlatform === 'kick')
        ? 'Conectado'
        : 'Login Kick'
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">MultiStream Chat</h1>
        <p className="login-subtitle">Conecte-se aos chats da Twitch e Kick</p>

        <div className="login-form">
          <div className="platform-section">
            {/* Twitch Section */}
            <div style={{ marginBottom: '20px' }}>
              <button
                className="oauth-button twitch-button"
                onClick={handleTwitchOAuth}
                disabled={isLoadingTwitch || (isAuthenticated && authenticatedPlatform === 'twitch')}
                style={{ marginBottom: '15px', width: '100%' }}
              >
                <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                </svg>
                {twitchButtonText()}
              </button>
            </div>

            {/* Kick Section */}
            <div>
              <button
                className="oauth-button kick-button"
                onClick={handleKickOAuth}
                disabled={isLoadingKick || (isAuthenticated && authenticatedPlatform === 'kick')}
                style={{ marginBottom: '15px', width: '100%' }}
              >
                <svg className="button-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M37 .036h164.448v113.621h54.71v-56.82h54.731V.036h164.448v170.777h-54.73v56.82h-54.711v56.8h54.71v56.82h54.73V512.03H310.89v-56.82h-54.73v-56.8h-54.711v113.62H37V.036z" />
                </svg>
                {kickButtonText()}
              </button>
            </div>

            {/* Widget URL Section - Only show when authenticated */}
            {isAuthenticated && widgetUrl && (
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>
                  URL do Widget OBS:
                </p>
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
                <button
                  onClick={goToChat}
                  className="go-to-chat-button"
                  style={{ marginTop: '10px' }}
                >
                  Ir para o Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
