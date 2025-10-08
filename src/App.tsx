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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5 font-sans">
      <div className="bg-white/98 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-10 md:p-6 max-w-[800px] w-full animate-fade-in">
        <h1 className="text-4xl md:text-3xl font-bold text-center m-0 mb-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">MultiStream Chat</h1>
        <p className="text-center text-gray-600 m-0 mb-10 text-base">Conecte-se aos chats da Twitch e Kick</p>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-5 border border-red-200">
            {error}
          </div>
        )}


        <div className="flex flex-col gap-8">
          <div className="bg-gray-100 rounded-xl p-6 border-2 border-transparent transition-all duration-300">
            {/* Twitch Section */}
            <div className="mb-5">
              <div className="flex gap-2.5">
                <button
                  className="flex-1 mb-4 px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(145,70,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleTwitchOAuth}
                  disabled={isLoadingTwitch || twitchAuthenticated}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                  </svg>
                  {twitchButtonText()}
                </button>

                {twitchAuthenticated && (
                  <button
                    onClick={handleTwitchSignOut}
                    className="mb-4 px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)] w-[120px]"
                    title="Sair do Twitch"
                  >
                    Sair
                  </button>
                )}
              </div>
            </div>

            {/* Kick Section */}
            <div>
              <label className="block mb-2 text-gray-800 font-medium text-sm">
                Canal da Kick
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={kickChannel}
                  onChange={(e) => setKickChannel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleKickChannelSubmit()}
                  placeholder="Digite o nome do canal"
                  className="flex-1 px-4 py-3 border-2 border-green-400 focus:border-green-500 rounded-lg text-base outline-none transition-colors duration-300"
                />

                {!kickChannelSaved ? (
                  <button
                    onClick={handleKickChannelSubmit}
                    className="w-[120px] px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-black bg-[#53fc18] hover:bg-[#42d914] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(83,252,24,0.3)]"
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    onClick={handleKickChannelClear}
                    className="w-[120px] px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)]"
                    title="Limpar canal"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Widget URL Section */}
            {(twitchWidgetUrl || kickWidgetUrl) && (
              <div className="mt-8 pt-5 border-t-2 border-gray-300 animate-slide-down">
                <p className="m-0 mb-2.5 font-bold">
                  URL do Widget(Pode usar no OBS):
                </p>
                <div className="flex flex-col md:flex-row gap-2.5 mb-5">
                  <input
                    type="text"
                    value={twitchWidgetUrl || kickWidgetUrl}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-lg text-sm bg-gray-50 text-gray-800 font-mono outline-none"
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
                  }} className="bg-green-500 text-white border-0 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(46,204,113,0.3)] md:w-full">
                    Copiar
                  </button>
                </div>
                <button
                  onClick={() => window.open(twitchWidgetUrl || kickWidgetUrl, '_blank')?.focus()}
                  className="bg-indigo-500 text-white border-0 rounded-lg px-8 py-3.5 text-base font-semibold cursor-pointer transition-all duration-300 w-full hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(102,126,234,0.3)] mt-2.5"
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
