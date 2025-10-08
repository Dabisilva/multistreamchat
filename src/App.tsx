import React, { useState, useEffect, useCallback } from 'react';
import OAuthService from './services/OAuthService';

import './style.css';

const baseUrl = window.location.origin;
interface LoginProps {
  onLogin?: (twitchToken: string, twitchChannel: string, kickChannel?: string) => void;
}

const App: React.FC<LoginProps> = () => {
  const [isLoadingTwitch, setIsLoadingTwitch] = useState(false);
  const [error, setError] = useState('');
  const [twitchAuthenticated, setTwitchAuthenticated] = useState(false);
  const [kickChannel, setKickChannel] = useState(localStorage.getItem('kickChannel') || '');
  const [kickChannelSaved, setKickChannelSaved] = useState(!!localStorage.getItem('kickChannel'));
  const [twitchWidgetUrl, setTwitchWidgetUrl] = useState('');
  const [kickWidgetUrl, setKickWidgetUrl] = useState('');

  // Process Twitch OAuth callback
  const processTwitchOAuthCallback = useCallback(async (code: string, state: string) => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback('twitch', code, state);
      const userData = await OAuthService.getTwitchUserInfo(tokenResponse.access_token);

      // Get the client ID that was used for OAuth
      const clientId = (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';

      // Store tokens, client ID, and user info
      localStorage.setItem('twitchToken', tokenResponse.access_token);
      localStorage.setItem('twitchClientId', clientId); // ⭐ Store the client ID used
      localStorage.setItem('twitchUserInfo', JSON.stringify(userData));
      localStorage.setItem('twitchChannelInfo', JSON.stringify({
        username: userData.username,
        displayName: userData.displayName,
        id: userData.id,
        platform: 'twitch'
      }));

      if (tokenResponse.refresh_token) {
        localStorage.setItem('twitchRefreshToken', tokenResponse.refresh_token);
      }

      // Generate widget URL with parameters
      const widget = `${baseUrl}/chat?twitchChannel=${userData.username}&twitchToken=${tokenResponse.access_token}`;
      setTwitchWidgetUrl(widget);
      setTwitchAuthenticated(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar autenticação da Twitch');
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

        if (state === twitchState) {
          setIsLoadingTwitch(true);
          try {
            await processTwitchOAuthCallback(code, state);
          } catch (err) {
            // Error already handled in processTwitchOAuthCallback
          } finally {
            setIsLoadingTwitch(false);
          }
        } else {
          setError('Estado de autenticação inválido. Por favor, tente novamente.');
        }
      }

      // Check for existing Twitch authentication
      const twitchToken = localStorage.getItem('twitchToken');
      const twitchUser = localStorage.getItem('twitchUserInfo');
      const savedKickChannel = localStorage.getItem('kickChannel');

      if (twitchToken && twitchUser) {
        const userData = JSON.parse(twitchUser);
        let widget = `${baseUrl}/chat?twitchChannel=${userData.username}&twitchToken=${twitchToken}`;

        // If there's a saved Kick channel, append it
        if (savedKickChannel) {
          setKickChannel(savedKickChannel);
          widget += `&kickChannel=${encodeURIComponent(savedKickChannel)}`;
        }

        setTwitchWidgetUrl(widget);
        setTwitchAuthenticated(true);
        setError('')
      } else if (savedKickChannel) {
        // If only Kick channel is saved (no Twitch)
        setKickChannel(savedKickChannel);
        setKickWidgetUrl(`${baseUrl}/chat?kickChannel=${encodeURIComponent(savedKickChannel)}`);
      }
    };

    init();
  }, [processTwitchOAuthCallback]);

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

  const handleTwitchSignOut = () => {
    localStorage.removeItem('twitchToken');
    localStorage.removeItem('twitchClientId');
    localStorage.removeItem('twitchUserInfo');
    localStorage.removeItem('twitchChannelInfo');
    localStorage.removeItem('twitchRefreshToken');
    setTwitchAuthenticated(false);
    setTwitchWidgetUrl('');
  };

  const handleKickChannelSubmit = () => {
    if (kickChannel.length < 3) {
      setError('Por favor, insira um nome de canal do Kick');
      return;
    }

    const trimmedChannel = kickChannel.trim();
    setKickChannel(trimmedChannel);

    // Save to localStorage
    localStorage.setItem('kickChannel', trimmedChannel);
    setKickChannelSaved(true);

    const baseUrl = window.location.origin;

    // If Twitch is authenticated, append or update Kick parameter
    if (twitchWidgetUrl) {
      let url = twitchWidgetUrl;

      // Remove existing kickChannel parameter if present
      url = url.replace(/&kickChannel=[^&]*/, '');

      // Add the new kickChannel parameter
      url = `${url}&kickChannel=${encodeURIComponent(trimmedChannel)}`;
      setTwitchWidgetUrl(url);
    } else {
      // Otherwise, create URL with just Kick
      const url = `${baseUrl}/chat?kickChannel=${encodeURIComponent(trimmedChannel)}`;
      setKickWidgetUrl(url);
    }

    setError('');
  };

  const handleKickChannelClear = () => {
    setKickChannel('');

    // Remove from localStorage
    localStorage.removeItem('kickChannel');
    setKickChannelSaved(false);

    // If Twitch URL exists, remove kickChannel parameter from it
    if (twitchWidgetUrl && twitchWidgetUrl.includes('kickChannel=')) {
      const url = twitchWidgetUrl.replace(/&kickChannel=[^&]*/, '');
      setTwitchWidgetUrl(url);
    } else {
      setKickWidgetUrl('');
    }
  };


  const twitchButtonText = () => {
    return isLoadingTwitch
      ? 'Carregando...'
      : twitchAuthenticated
        ? 'Conectado'
        : 'Login Twitch'
  };

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
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="oauth-button twitch-button"
                  onClick={handleTwitchOAuth}
                  disabled={isLoadingTwitch || twitchAuthenticated}
                  style={{ marginBottom: '15px', flex: 1 }}
                >
                  <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                  </svg>
                  {twitchButtonText()}
                </button>

                {twitchAuthenticated && (
                  <button
                    onClick={handleTwitchSignOut}
                    className="oauth-button"
                    style={{
                      marginBottom: '15px',
                      background: '#ff6b6b',
                      width: '120px'
                    }}
                    title="Sair do Twitch"
                  >
                    Sair
                  </button>
                )}
              </div>
            </div>

            {/* Kick Section */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                Canal da Kick
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={kickChannel}
                  onChange={(e) => setKickChannel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleKickChannelSubmit()}
                  placeholder="Digite o nome do canal"
                  className="channel-input"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #53fc18',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#45d912'}
                  onBlur={(e) => e.target.style.borderColor = '#53fc18'}
                />

                {!kickChannelSaved ? (
                  <button
                    onClick={handleKickChannelSubmit}
                    className="oauth-button kick-button"
                    style={{ width: '120px', marginBottom: 0 }}
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    onClick={handleKickChannelClear}
                    className="oauth-button"
                    style={{
                      background: '#ff6b6b',
                      width: '120px',
                      marginBottom: 0
                    }}
                    title="Limpar canal"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Widget URL Section */}
            {(twitchWidgetUrl || kickWidgetUrl) && (
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  URL do Widget:
                </p>
                <div className="url-input-container">
                  <input
                    type="text"
                    value={twitchWidgetUrl || kickWidgetUrl}
                    readOnly
                    className="widget-url-input"
                  />
                  <button onClick={() => {
                    const url = twitchWidgetUrl || kickWidgetUrl;
                    navigator.clipboard.writeText(url).catch(() => {
                      const textArea = document.createElement('textarea');
                      textArea.value = url;
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
                  onClick={() => window.open(twitchWidgetUrl || kickWidgetUrl, '_blank')?.focus()}
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

export default App;
