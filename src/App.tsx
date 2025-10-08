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
  const [showCustomization, setShowCustomization] = useState(false);

  // Customization options
  const [usernameBgColor, setUsernameBgColor] = useState('#30034d');
  const [usernameTextColor, setUsernameTextColor] = useState('#ffffff');
  const [messageBgColor, setMessageBgColor] = useState('#8b5cf6');
  const [messageTextColor, setMessageTextColor] = useState('#ffffff');
  const [usernameBgAlpha, setUsernameBgAlpha] = useState('1');
  const [usernameTextAlpha, setUsernameTextAlpha] = useState('1');
  const [messageBgAlpha, setMessageBgAlpha] = useState('1');
  const [messageTextAlpha, setMessageTextAlpha] = useState('1');
  const [borderRadius, setBorderRadius] = useState('10');
  const [usernameFontSize, setUsernameFontSize] = useState('16');
  const [messageFontSize, setMessageFontSize] = useState('20');
  const [messagePadding, setMessagePadding] = useState('0');
  const [messageDelay, setMessageDelay] = useState('5');

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

      // Generate widget URL with all necessary parameters
      const broadcasterId = userData.broadcasterId || userData.id;
      const widget = `${baseUrl}/chat?twitchChannel=${userData.username}&twitchToken=${tokenResponse.access_token}&broadcasterId=${broadcasterId}&clientId=${clientId}${getCustomizationParams()}`;

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
        const storedClientId = localStorage.getItem('twitchClientId') || (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
        const broadcasterId = userData.broadcasterId || userData.id;

        let widget = `${baseUrl}/chat?twitchChannel=${userData.username}&twitchToken=${twitchToken}&broadcasterId=${broadcasterId}&clientId=${storedClientId}${getCustomizationParams()}`;

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

  // Update widget URL when customization changes
  useEffect(() => {
    if (twitchWidgetUrl || kickWidgetUrl) {
      const baseUrl = window.location.origin;
      const twitchToken = localStorage.getItem('twitchToken');
      const twitchUser = localStorage.getItem('twitchUserInfo');
      const storedClientId = localStorage.getItem('twitchClientId') || (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
      const savedKickChannel = localStorage.getItem('kickChannel');

      if (twitchToken && twitchUser) {
        const userData = JSON.parse(twitchUser);
        const broadcasterId = userData.broadcasterId || userData.id;
        let widget = `${baseUrl}/chat?twitchChannel=${userData.username}&twitchToken=${twitchToken}&broadcasterId=${broadcasterId}&clientId=${storedClientId}${getCustomizationParams()}`;

        if (savedKickChannel) {
          widget += `&kickChannel=${encodeURIComponent(savedKickChannel)}`;
        }

        setTwitchWidgetUrl(widget);
      } else if (kickWidgetUrl && savedKickChannel) {
        const url = `${baseUrl}/chat?kickChannel=${encodeURIComponent(savedKickChannel)}${getCustomizationParams()}`;
        setKickWidgetUrl(url);
      }
    }
  }, [usernameBgColor, usernameTextColor, messageBgColor, messageTextColor, usernameBgAlpha, usernameTextAlpha, messageBgAlpha, messageTextAlpha, borderRadius, usernameFontSize, messageFontSize, messagePadding, messageDelay]);

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
      const url = `${baseUrl}/chat?kickChannel=${encodeURIComponent(trimmedChannel)}${getCustomizationParams()}`;
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


  const openChatPopup = () => {
    const url = twitchWidgetUrl || kickWidgetUrl;
    const width = 480;
    const height = 800;
    const left = window.screen.width - width;
    const top = 400;

    window.open(
      url,
      'ChatWidget',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,addressbar=no`
    )?.focus();
  };

  // Helper function to convert hex to RGBA
  const hexToRgba = (hex: string, alpha: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getCustomizationParams = () => {
    const usernameBgRgba = hexToRgba(usernameBgColor, usernameBgAlpha);
    const usernameColorRgba = hexToRgba(usernameTextColor, usernameTextAlpha);
    const messageBgRgba = hexToRgba(messageBgColor, messageBgAlpha);
    const messageColorRgba = hexToRgba(messageTextColor, messageTextAlpha);

    return `&usernameBg=${encodeURIComponent(usernameBgRgba)}&usernameColor=${encodeURIComponent(usernameColorRgba)}&messageBg=${encodeURIComponent(messageBgRgba)}&messageColor=${encodeURIComponent(messageColorRgba)}&borderRadius=${borderRadius}&usernameFontSize=${usernameFontSize}&messageFontSize=${messageFontSize}&messagePadding=${messagePadding}&messageDelay=${messageDelay}`;
  };

  const copyChatUrl = () => {
    const url = twitchWidgetUrl || kickWidgetUrl;
    navigator.clipboard.writeText(url).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
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
      <div className="bg-dark-bg-secondary rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-10 md:p-6 border border-dark-border">
        <h1 className="text-4xl md:text-3xl font-bold text-center m-0 mb-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">MultiStreamDB Chat</h1>
        <p className="text-center text-dark-text-secondary m-0 mb-10 text-base">Conecte-se aos chats da Twitch e Kick</p>

        <div className="flex gap-8">
          <div className="bg-dark-bg-card rounded-xl p-6 border border-dark-border">
            {error && (
              <div className="bg-red-900/20 text-red-400 p-4 rounded-lg mb-5 border border-red-800">
                {error}
              </div>
            )}
            {/* Twitch Section */}
            <div className="mb-5">
              <div className="flex gap-2.5">
                <button
                  className="flex-1 mb-4 px-6 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(145,70,255,0.3)] disabled:cursor-not-allowed"
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
              <label className="block mb-2 text-dark-text-primary font-medium text-sm">
                Canal da Kick
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={kickChannel}
                  onChange={(e) => setKickChannel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleKickChannelSubmit()}
                  placeholder="Digite o nome do canal"
                  className="flex-1 px-4 py-3 bg-dark-bg-primary border-2 border-dark-border focus:border-green-500 rounded-lg text-base text-dark-text-primary placeholder-dark-text-muted outline-none transition-colors duration-300"
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
              <div className="mt-8 pt-5 border-t-2 border-dark-border animate-slide-down">
                <p className="m-0 mb-2.5 font-bold text-dark-text-primary">
                  URL do Widget(Pode usar no OBS):
                </p>
                <div className="flex flex-col md:flex-row gap-2.5 mb-5">
                  <input
                    type="password"
                    value={twitchWidgetUrl || kickWidgetUrl}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-dark-border focus:border-green-500 rounded-lg text-sm bg-dark-bg-primary text-dark-text-primary font-mono outline-none"
                  />
                  <button onClick={copyChatUrl} className="w-[120px] bg-green-500 text-white border-0 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(46,204,113,0.3)]">
                    Copiar
                  </button>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={openChatPopup}
                    className="flex-1 bg-indigo-500 text-white border-0 rounded-lg px-8 py-3.5 text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(102,126,234,0.3)] mt-2.5"
                  >
                    Abrir Chat
                  </button>
                  <button
                    onClick={() => setShowCustomization(!showCustomization)}
                    className="flex-1 bg-purple-500 text-white border-0 rounded-lg px-8 py-3.5 text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-purple-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(139,92,246,0.3)] mt-2.5"
                  >
                    {showCustomization ? 'Fechar Edição' : 'Editar Chat'}
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Customization Panel */}
          {showCustomization && (twitchWidgetUrl || kickWidgetUrl) && (
            <div className="flex gap-8 bg-dark-bg-card rounded-xl p-6 border border-dark-border">
              <div className="bg-dark-bg-primary rounded-xl p-6 border border-dark-border">
                <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">Opções de Personalização</h3>

                <div className="space-y-4">
                  {/* Username Background Color */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Cor de Fundo do Nome
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={usernameBgColor}
                        onChange={(e) => setUsernameBgColor(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={usernameBgColor}
                        onChange={(e) => setUsernameBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <label className="block text-xs font-medium text-dark-text-muted mt-2 mb-1">
                      Transparência: {Math.round(parseFloat(usernameBgAlpha) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={usernameBgAlpha}
                      onChange={(e) => setUsernameBgAlpha(e.target.value)}
                      className="w-full accent-purple-600"
                    />
                  </div>

                  {/* Username Text Color */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Cor do Texto do Nome
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={usernameTextColor}
                        onChange={(e) => setUsernameTextColor(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={usernameTextColor}
                        onChange={(e) => setUsernameTextColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <label className="block text-xs font-medium text-dark-text-muted mt-2 mb-1">
                      Transparência: {Math.round(parseFloat(usernameTextAlpha) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={usernameTextAlpha}
                      onChange={(e) => setUsernameTextAlpha(e.target.value)}
                      className="w-full accent-purple-600"
                    />
                  </div>

                  {/* Message Background Color */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Cor de Fundo da Mensagem
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={messageBgColor}
                        onChange={(e) => setMessageBgColor(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={messageBgColor}
                        onChange={(e) => setMessageBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <label className="block text-xs font-medium text-dark-text-muted mt-2 mb-1">
                      Transparência: {Math.round(parseFloat(messageBgAlpha) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={messageBgAlpha}
                      onChange={(e) => setMessageBgAlpha(e.target.value)}
                      className="w-full accent-purple-600"
                    />
                  </div>

                  {/* Message Text Color */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Cor do Texto da Mensagem
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={messageTextColor}
                        onChange={(e) => setMessageTextColor(e.target.value)}
                        className="h-10 w-20 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={messageTextColor}
                        onChange={(e) => setMessageTextColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <label className="block text-xs font-medium text-dark-text-muted mt-2 mb-1">
                      Transparência: {Math.round(parseFloat(messageTextAlpha) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={messageTextAlpha}
                      onChange={(e) => setMessageTextAlpha(e.target.value)}
                      className="w-full accent-purple-600"
                    />
                  </div>

                  {/* Border Radius */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Borda arredondada (px)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                    />
                  </div>

                  {/* Username Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Tamanho do Nome (px)
                    </label>
                    <input
                      type="number"
                      min="12"
                      max="32"
                      value={usernameFontSize}
                      onChange={(e) => setUsernameFontSize(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                    />
                  </div>

                  {/* Message Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Tamanho da Mensagem (px)
                    </label>
                    <input
                      type="number"
                      min="12"
                      max="32"
                      value={messageFontSize}
                      onChange={(e) => setMessageFontSize(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                    />
                  </div>

                  {/* Message Padding */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Espacamento da Mensagem (px)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={messagePadding}
                      onChange={(e) => setMessagePadding(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                    />
                  </div>

                  {/* Message Delay */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Delay das Mensagens: {messageDelay}s
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={messageDelay}
                      onChange={(e) => setMessageDelay(e.target.value)}
                      className="w-full accent-purple-600"
                    />
                    <p className="text-xs text-dark-text-muted mt-1">
                      Mods, VIPs e dono do canal não são afetados
                    </p>
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="bg-dark-bg-primary rounded-xl p-4 border border-dark-border">
                <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">Preview</h3>
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4">
                  <div className="space-y-3">
                    {/* Example Message 1 */}
                    <div className="p-0 rounded-none break-words bg-transparent border-0">
                      <div
                        className="flex items-center gap-1.5 font-bold w-fit px-2 py-1"
                        style={{
                          backgroundColor: hexToRgba(usernameBgColor, usernameBgAlpha),
                          color: hexToRgba(usernameTextColor, usernameTextAlpha),
                          fontSize: `${usernameFontSize}px`,
                          borderRadius: `${borderRadius}px`
                        }}
                      >
                        <span>Streamer</span>
                      </div>
                      <div
                        className="leading-[1.4] m-0 ml-1.5 w-fit inline-block"
                        style={{
                          backgroundColor: hexToRgba(messageBgColor, messageBgAlpha),
                          color: hexToRgba(messageTextColor, messageTextAlpha),
                          fontSize: `${messageFontSize}px`,
                          borderRadius: `${borderRadius}px`,
                          padding: `${messagePadding}px`
                        }}
                      >
                        Esta é uma mensagem de exemplo! 👋
                      </div>
                    </div>

                    {/* Example Message 2 */}
                    <div className="my-1 p-0 rounded-none max-w-[90%] break-words bg-transparent border-0">
                      <div
                        className="flex items-center gap-1.5 font-bold w-fit px-2 py-1"
                        style={{
                          backgroundColor: hexToRgba(usernameBgColor, usernameBgAlpha),
                          color: hexToRgba(usernameTextColor, usernameTextAlpha),
                          fontSize: `${usernameFontSize}px`,
                          borderRadius: `${borderRadius}px`
                        }}
                      >
                        <span>Viewer</span>
                      </div>
                      <div
                        className="leading-[1.4] m-0 ml-1.5 w-fit inline-block"
                        style={{
                          backgroundColor: hexToRgba(messageBgColor, messageBgAlpha),
                          color: hexToRgba(messageTextColor, messageTextAlpha),
                          fontSize: `${messageFontSize}px`,
                          borderRadius: `${borderRadius}px`,
                          padding: `${messagePadding}px`
                        }}
                      >
                        Olá! Chat ficou incrível! 🎉
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
