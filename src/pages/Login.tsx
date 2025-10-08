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
  const [twitchAuthenticated, setTwitchAuthenticated] = useState(false);
  const [kickAuthenticated, setKickAuthenticated] = useState(false);
  const [twitchWidgetUrl, setTwitchWidgetUrl] = useState('');
  const [kickWidgetUrl, setKickWidgetUrl] = useState('');

  // Process OAuth callback
  const processOAuthCallback = useCallback(async (code: string, state: string, platform: 'twitch' | 'kick') => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback(platform, code, state);

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

      // Set platform-specific state
      if (platform === 'twitch') {
        setTwitchWidgetUrl(widget);
        setTwitchAuthenticated(true);
      } else {
        setKickWidgetUrl(widget);
        setKickAuthenticated(true);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar autenticação');
      throw err;
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      // First, process OAuth callback if present (new authentication)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const urlError = urlParams.get('error');

      if (urlError) {
        setError(`Erro de autenticação: ${urlError}`);
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

      // Always check for existing auth (supports both platforms simultaneously)
      const twitchToken = localStorage.getItem('twitchToken');
      const kickToken = localStorage.getItem('kickToken');
      const twitchUser = localStorage.getItem('twitchUserInfo');
      const kickUser = localStorage.getItem('kickUserInfo');

      // Check Twitch authentication
      if (twitchToken && twitchUser) {
        const userData = JSON.parse(twitchUser);
        const widget = `${baseUrl}/?twitchChannel=${userData.username}&twitchToken=${twitchToken}`;
        setTwitchWidgetUrl(widget);
        setTwitchAuthenticated(true);
      }

      // Check Kick authentication (doesn't return, so both can be checked)
      if (kickToken && kickUser) {
        const userData = JSON.parse(kickUser);
        const widget = `${baseUrl}/?kickChannel=${userData.username}&kickToken=${kickToken}`;
        setKickWidgetUrl(widget);
        setKickAuthenticated(true);
      }
    };

    init();
  }, [processOAuthCallback]);

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


  const twitchButtonText = () => {
    return isLoadingTwitch
      ? 'Carregando...'
      : twitchAuthenticated
        ? 'Conectado'
        : 'Login Twitch'
  };

  const kickButtonText = () => {
    return isLoadingKick
      ? 'Carregando...'
      : kickAuthenticated
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
                disabled={isLoadingTwitch || twitchAuthenticated}
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
                disabled={isLoadingKick || kickAuthenticated}
                style={{ marginBottom: '15px', width: '100%' }}
              >
                <svg className="button-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M37 .036h164.448v113.621h54.71v-56.82h54.731V.036h164.448v170.777h-54.73v56.82h-54.711v56.8h54.71v56.82h54.73V512.03H310.89v-56.82h-54.73v-56.8h-54.711v113.62H37V.036z" />
                </svg>
                {kickButtonText()}
              </button>
            </div>

            {/* Widget URL Section - Show when any platform is authenticated */}
            {(twitchAuthenticated || kickAuthenticated) && (
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>

                {/* Twitch Widget URL */}
                {twitchAuthenticated && twitchWidgetUrl && (
                  <div style={{ marginBottom: kickAuthenticated ? '20px' : '0' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#9146ff' }}>
                      🎮 URL do Widget Twitch:
                    </p>
                    <div className="url-input-container">
                      <input
                        type="text"
                        value={twitchWidgetUrl}
                        readOnly
                        className="widget-url-input"
                      />
                      <button onClick={() => {
                        navigator.clipboard.writeText(twitchWidgetUrl).catch(() => {
                          const textArea = document.createElement('textarea');
                          textArea.value = twitchWidgetUrl;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        });
                      }} className="copy-button">
                        Copiar
                      </button>
                    </div>
                    <button
                      onClick={() => window.open(twitchWidgetUrl, '_blank')?.focus()}
                      className="go-to-chat-button"
                      style={{ marginTop: '10px' }}
                    >
                      Ir para o Chat Twitch
                    </button>
                  </div>
                )}

                {/* Kick Widget URL */}
                {kickAuthenticated && kickWidgetUrl && (
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#53fc18' }}>
                      ⚡ URL do Widget Kick:
                    </p>
                    <div className="url-input-container">
                      <input
                        type="text"
                        value={kickWidgetUrl}
                        readOnly
                        className="widget-url-input"
                      />
                      <button onClick={() => {
                        navigator.clipboard.writeText(kickWidgetUrl).catch(() => {
                          const textArea = document.createElement('textarea');
                          textArea.value = kickWidgetUrl;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        });
                      }} className="copy-button">
                        Copiar
                      </button>
                    </div>
                    <button
                      onClick={() => window.open(kickWidgetUrl, '_blank')?.focus()}
                      className="go-to-chat-button"
                      style={{ marginTop: '10px' }}
                    >
                      Ir para o Chat Kick
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
