import React, { useState, useEffect, useRef } from "react";
import OAuthService from "./services/OAuthService";
import CustomRangeInput from "./components/CustomRangeInput";
import { MessageRow } from "./components/MessageRow";

import "./style.css";

const baseUrl = window.location.origin;

interface LoginProps {
  onLogin?: (
    twitchToken: string,
    twitchChannel: string,
    kickChannel?: string,
  ) => void;
}

const App: React.FC<LoginProps> = () => {
  const [isLoadingTwitch, setIsLoadingTwitch] = useState(false);
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [error, setError] = useState("");
  const [twitchAuthenticated, setTwitchAuthenticated] = useState(false);
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(false);
  const [kickChannel, setKickChannel] = useState(
    localStorage.getItem("kickChannel") || "",
  );
  const [kickChannelSaved, setKickChannelSaved] = useState(
    !!localStorage.getItem("kickChannel"),
  );
  const [widgetUrl, setWidgetUrl] = useState("");
  const [showCustomization, setShowCustomization] = useState(false);

  // Customization options
  const [usernameBgColor, setUsernameBgColor] = useState("#30034d");
  const [messageBgColor, setMessageBgColor] = useState("#8b5cf6");
  const [messageTextColor, setMessageTextColor] = useState("#ffffff");
  const [usernameBgAlpha, setUsernameBgAlpha] = useState("0");
  const [messageBgAlpha, setMessageBgAlpha] = useState("0");
  const [messageTextAlpha, setMessageTextAlpha] = useState("1");
  const [borderRadius, setBorderRadius] = useState("4");
  const [usernameFontSize, setUsernameFontSize] = useState("20");
  const [messageFontSize, setMessageFontSize] = useState("20");
  const [messagePadding, setMessagePadding] = useState("0");
  const [messageDelay, setMessageDelay] = useState("5");
  const [fullWidthMessages, setFullWidthMessages] = useState(false);

  // Helper function to convert hex to RGBA
  const hexToRgba = (hex: string, alpha: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getCustomizationParams = () => {
    const usernameBgRgba = hexToRgba(usernameBgColor, usernameBgAlpha);
    const messageBgRgba = hexToRgba(messageBgColor, messageBgAlpha);
    const messageColorRgba = hexToRgba(messageTextColor, messageTextAlpha);

    return (
      `&usernameBg=${encodeURIComponent(usernameBgRgba)}` +
      `&messageBg=${encodeURIComponent(messageBgRgba)}` +
      `&messageColor=${encodeURIComponent(messageColorRgba)}` +
      `&borderRadius=${borderRadius}` +
      `&usernameFontSize=${usernameFontSize}` +
      `&messageFontSize=${messageFontSize}` +
      `&messagePadding=${messagePadding}` +
      `&messageDelay=${messageDelay}` +
      `&fullWidthMessages=${fullWidthMessages}`
    );
  };

  const buildWidgetUrl = (): string => {
    const params: string[] = [];

    const twitchToken = localStorage.getItem("twitchToken");
    const twitchUser = localStorage.getItem("twitchUserInfo");
    if (twitchToken && twitchUser) {
      try {
        const userData = JSON.parse(twitchUser);
        const storedClientId =
          localStorage.getItem("twitchClientId") ||
          (import.meta as any).env?.VITE_TWITCH_CLIENT_ID ||
          "kimne78kx3ncx6brgo4mv6wki5h1ko";
        const broadcasterId = userData.broadcasterId || userData.id;
        const storedRefreshToken = localStorage.getItem("twitchRefreshToken");
        const storedExpiresAt = localStorage.getItem("twitchTokenExpiresAt");

        params.push(`twitchChannel=${encodeURIComponent(userData.username)}`);
        params.push(`twitchToken=${encodeURIComponent(twitchToken)}`);
        params.push(`broadcasterId=${encodeURIComponent(broadcasterId)}`);
        params.push(`clientId=${encodeURIComponent(storedClientId)}`);
        if (storedRefreshToken) {
          params.push(
            `refreshToken=${encodeURIComponent(storedRefreshToken)}`,
          );
        }
        if (storedExpiresAt) {
          params.push(`expiresAt=${encodeURIComponent(storedExpiresAt)}`);
        }
      } catch {
        // ignore invalid twitch user json
      }
    }

    const savedKickChannel = localStorage.getItem("kickChannel");
    if (savedKickChannel) {
      params.push(`kickChannel=${encodeURIComponent(savedKickChannel)}`);
    }

    const youtubeToken = localStorage.getItem("youtubeToken");
    const youtubeUser = localStorage.getItem("youtubeUserInfo");
    if (youtubeToken && youtubeUser) {
      try {
        const userData = JSON.parse(youtubeUser);
        const channelId =
          userData.broadcasterId ||
          userData.id ||
          localStorage.getItem("youtubeChannelId") ||
          "";
        const storedRefreshToken = localStorage.getItem("youtubeRefreshToken");
        const storedExpiresAt = localStorage.getItem("youtubeTokenExpiresAt");

        params.push(
          `youtubeChannel=${encodeURIComponent(userData.username)}`,
        );
        params.push(`youtubeToken=${encodeURIComponent(youtubeToken)}`);
        if (channelId) {
          params.push(`youtubeChannelId=${encodeURIComponent(channelId)}`);
        }
        if (storedRefreshToken) {
          params.push(
            `youtubeRefreshToken=${encodeURIComponent(storedRefreshToken)}`,
          );
        }
        if (storedExpiresAt) {
          params.push(
            `youtubeExpiresAt=${encodeURIComponent(storedExpiresAt)}`,
          );
        }
      } catch {
        // ignore invalid youtube user json
      }
    }

    if (params.length === 0) return "";

    return `${baseUrl}/chat?${params.join("&")}${getCustomizationParams()}`;
  };

  const refreshWidgetUrl = () => {
    setWidgetUrl(buildWidgetUrl());
  };

  // Process Twitch OAuth callback
  const processTwitchOAuthCallback = async (code: string, state: string) => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback(
        "twitch",
        code,
        state,
      );
      const userData = await OAuthService.getTwitchUserInfo(
        tokenResponse.access_token,
      );

      const clientId =
        (import.meta as any).env?.VITE_TWITCH_CLIENT_ID ||
        "kimne78kx3ncx6brgo4mv6wki5h1ko";

      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

      localStorage.setItem("twitchToken", tokenResponse.access_token);
      localStorage.setItem("twitchClientId", clientId);
      localStorage.setItem("twitchTokenExpiresAt", expiresAt.toString());
      localStorage.setItem("twitchUserInfo", JSON.stringify(userData));
      localStorage.setItem(
        "twitchChannelInfo",
        JSON.stringify({
          username: userData.username,
          displayName: userData.displayName,
          id: userData.id,
          platform: "twitch",
        }),
      );

      if (tokenResponse.refresh_token) {
        localStorage.setItem("twitchRefreshToken", tokenResponse.refresh_token);
      }

      setTwitchAuthenticated(true);
      refreshWidgetUrl();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao processar autenticação da Twitch",
      );
      throw err;
    }
  };

  // Process YouTube OAuth callback
  const processYoutubeOAuthCallback = async (code: string, state: string) => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback(
        "youtube",
        code,
        state,
      );

      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

      // Persist token first so a later user-info failure doesn't lose the session
      localStorage.setItem("youtubeToken", tokenResponse.access_token);
      localStorage.setItem("youtubeTokenExpiresAt", expiresAt.toString());
      if (tokenResponse.refresh_token) {
        localStorage.setItem(
          "youtubeRefreshToken",
          tokenResponse.refresh_token,
        );
      }

      const userData = await OAuthService.getYoutubeUserInfo(
        tokenResponse.access_token,
      );

      localStorage.setItem("youtubeUserInfo", JSON.stringify(userData));
      localStorage.setItem("youtubeChannelId", userData.id);
      localStorage.setItem(
        "youtubeChannelInfo",
        JSON.stringify({
          username: userData.username,
          displayName: userData.displayName,
          id: userData.id,
          platform: "youtube",
        }),
      );

      setYoutubeAuthenticated(true);
      setError("");
      refreshWidgetUrl();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao processar autenticação do YouTube",
      );
      throw err;
    }
  };

  // Refresh Twitch token if expired or about to expire
  const refreshTwitchTokenIfNeeded = async (): Promise<string | null> => {
    const twitchToken = localStorage.getItem("twitchToken");
    const refreshToken = localStorage.getItem("twitchRefreshToken");
    const expiresAt = localStorage.getItem("twitchTokenExpiresAt");

    if (!twitchToken || !refreshToken) {
      return null;
    }

    const shouldRefresh =
      !expiresAt || parseInt(expiresAt) - Date.now() < 600000;

    if (shouldRefresh) {
      try {
        const tokenResponse =
          await OAuthService.refreshTwitchToken(refreshToken);

        const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

        localStorage.setItem("twitchToken", tokenResponse.access_token);
        localStorage.setItem("twitchTokenExpiresAt", newExpiresAt.toString());

        if (tokenResponse.refresh_token) {
          localStorage.setItem(
            "twitchRefreshToken",
            tokenResponse.refresh_token,
          );
        }

        refreshWidgetUrl();
        return tokenResponse.access_token;
      } catch (err) {
        handleTwitchSignOut();
        setError("Sua sessão da Twitch expirou. Por favor, faça login novamente.");
        return null;
      }
    }

    return twitchToken;
  };

  const refreshYoutubeTokenIfNeeded = async (): Promise<string | null> => {
    const youtubeToken = localStorage.getItem("youtubeToken");
    const refreshToken = localStorage.getItem("youtubeRefreshToken");
    const expiresAt = localStorage.getItem("youtubeTokenExpiresAt");

    if (!youtubeToken || !refreshToken) {
      return null;
    }

    const shouldRefresh =
      !expiresAt || parseInt(expiresAt) - Date.now() < 600000;

    if (shouldRefresh) {
      try {
        const tokenResponse =
          await OAuthService.refreshYoutubeToken(refreshToken);

        const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

        localStorage.setItem("youtubeToken", tokenResponse.access_token);
        localStorage.setItem("youtubeTokenExpiresAt", newExpiresAt.toString());

        if (tokenResponse.refresh_token) {
          localStorage.setItem(
            "youtubeRefreshToken",
            tokenResponse.refresh_token,
          );
        }

        refreshWidgetUrl();
        return tokenResponse.access_token;
      } catch (err) {
        handleYoutubeSignOut();
        setError(
          "Sua sessão do YouTube expirou. Por favor, faça login novamente.",
        );
        return null;
      }
    }

    return youtubeToken;
  };

  const refreshTwitchTokenRef = useRef(refreshTwitchTokenIfNeeded);
  refreshTwitchTokenRef.current = refreshTwitchTokenIfNeeded;
  const refreshYoutubeTokenRef = useRef(refreshYoutubeTokenIfNeeded);
  refreshYoutubeTokenRef.current = refreshYoutubeTokenIfNeeded;

  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const urlError = urlParams.get("error");
      const scope = urlParams.get("scope") || "";

      if (urlError) {
        setError(
          `Erro de autenticação: ${urlError}${urlParams.get("error_description") ? ` — ${urlParams.get("error_description")}` : ""}`,
        );
      }

      if (code && state) {
        // Survive React StrictMode remounts (refs reset; sessionStorage does not)
        const handledKey = `oauth_code_handled_${code.slice(0, 24)}`;
        if (!sessionStorage.getItem(handledKey)) {
          sessionStorage.setItem(handledKey, "1");

          const platform =
            OAuthService.detectOAuthPlatform(state) ||
            (scope.includes("youtube") ? "youtube" : null);

          // Clear OAuth query params immediately to avoid double-handling
          window.history.replaceState({}, document.title, "/");

          if (platform === "twitch") {
            setIsLoadingTwitch(true);
            try {
              await processTwitchOAuthCallback(code, state);
            } catch (err) {
              // Error already handled
            } finally {
              setIsLoadingTwitch(false);
            }
          } else if (platform === "youtube") {
            setIsLoadingYoutube(true);
            try {
              await processYoutubeOAuthCallback(code, state);
            } catch (err) {
              // Error already handled
            } finally {
              setIsLoadingYoutube(false);
            }
          } else {
            setError(
              "Callback OAuth recebido, mas a sessão local expirou. Clique em Login YouTube/Twitch novamente.",
            );
          }
        }
      }

      const twitchToken = localStorage.getItem("twitchToken");
      const twitchUser = localStorage.getItem("twitchUserInfo");
      const youtubeToken = localStorage.getItem("youtubeToken");
      const youtubeUser = localStorage.getItem("youtubeUserInfo");
      const savedKickChannel = localStorage.getItem("kickChannel");

      if (twitchToken && twitchUser) {
        const validToken = await refreshTwitchTokenIfNeeded();
        if (validToken) {
          setTwitchAuthenticated(true);
        }
      }

      if (youtubeToken && youtubeUser) {
        const validToken = await refreshYoutubeTokenIfNeeded();
        if (validToken) {
          setYoutubeAuthenticated(true);
        }
      } else if (youtubeToken && !youtubeUser) {
        // Token saved but profile fetch previously failed — retry
        try {
          const userData = await OAuthService.getYoutubeUserInfo(youtubeToken);
          localStorage.setItem("youtubeUserInfo", JSON.stringify(userData));
          localStorage.setItem("youtubeChannelId", userData.id);
          localStorage.setItem(
            "youtubeChannelInfo",
            JSON.stringify({
              username: userData.username,
              displayName: userData.displayName,
              id: userData.id,
              platform: "youtube",
            }),
          );
          setYoutubeAuthenticated(true);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Falha ao carregar canal do YouTube. Ative a YouTube Data API v3 no Google Cloud.",
          );
        }
      }

      if (savedKickChannel) {
        setKickChannel(savedKickChannel);
        setKickChannelSaved(true);
      }

      refreshWidgetUrl();
    };

    void init();
  }, []);

  // Periodic token refresh
  useEffect(() => {
    if (!twitchAuthenticated && !youtubeAuthenticated) return;

    const intervalId = setInterval(
      () => {
        if (twitchAuthenticated) void refreshTwitchTokenRef.current();
        if (youtubeAuthenticated) void refreshYoutubeTokenRef.current();
      },
      60 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [twitchAuthenticated, youtubeAuthenticated]);

  // Update widget URL when customization changes
  useEffect(() => {
    refreshWidgetUrl();
  }, [
    usernameBgColor,
    messageBgColor,
    messageTextColor,
    usernameBgAlpha,
    messageBgAlpha,
    messageTextAlpha,
    borderRadius,
    usernameFontSize,
    messageFontSize,
    messagePadding,
    messageDelay,
    fullWidthMessages,
    twitchAuthenticated,
    youtubeAuthenticated,
    kickChannelSaved,
  ]);

  const handleTwitchOAuth = async () => {
    setIsLoadingTwitch(true);
    setError("");

    try {
      await OAuthService.initiateTwitchOAuth();
    } catch (error) {
      setError("Erro ao iniciar autenticação com Twitch");
      setIsLoadingTwitch(false);
    }
  };

  const handleYoutubeOAuth = async () => {
    setIsLoadingYoutube(true);
    setError("");

    try {
      await OAuthService.initiateYoutubeOAuth();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Erro ao iniciar autenticação com YouTube",
      );
      setIsLoadingYoutube(false);
    }
  };

  const handleTwitchSignOut = () => {
    localStorage.removeItem("twitchToken");
    localStorage.removeItem("twitchClientId");
    localStorage.removeItem("twitchUserInfo");
    localStorage.removeItem("twitchChannelInfo");
    localStorage.removeItem("twitchRefreshToken");
    localStorage.removeItem("twitchTokenExpiresAt");
    setTwitchAuthenticated(false);
    refreshWidgetUrl();
  };

  const handleYoutubeSignOut = () => {
    localStorage.removeItem("youtubeToken");
    localStorage.removeItem("youtubeUserInfo");
    localStorage.removeItem("youtubeChannelInfo");
    localStorage.removeItem("youtubeChannelId");
    localStorage.removeItem("youtubeRefreshToken");
    localStorage.removeItem("youtubeTokenExpiresAt");
    setYoutubeAuthenticated(false);
    refreshWidgetUrl();
  };

  const handleKickChannelSubmit = () => {
    if (kickChannel.length < 3) {
      setError("Por favor, insira um nome de canal do Kick");
      return;
    }

    const trimmedChannel = kickChannel.trim();
    setKickChannel(trimmedChannel);
    localStorage.setItem("kickChannel", trimmedChannel);
    setKickChannelSaved(true);
    setError("");
    refreshWidgetUrl();
  };

  const handleKickChannelClear = () => {
    setKickChannel("");
    localStorage.removeItem("kickChannel");
    setKickChannelSaved(false);
    refreshWidgetUrl();
  };

  const openChatPopup = () => {
    const url = widgetUrl;
    const width = 480;
    const height = 800;
    const left = window.screen.width - width;
    const top = 400;

    window
      .open(
        url,
        "ChatWidget",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,addressbar=no`,
      )
      ?.focus();
  };

  const copyChatUrl = () => {
    navigator.clipboard.writeText(widgetUrl).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = widgetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.body.removeChild(textArea);
    });
  };

  const twitchButtonText = () => {
    return isLoadingTwitch
      ? "Carregando..."
      : twitchAuthenticated
        ? "Conectado"
        : "Login Twitch";
  };

  const youtubeButtonText = () => {
    return isLoadingYoutube
      ? "Carregando..."
      : youtubeAuthenticated
        ? "Conectado"
        : "Login YouTube";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5 font-sans">
      <div className="bg-dark-bg-secondary rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-10 md:p-6 border border-dark-border">
        <h1 className="text-4xl md:text-3xl font-bold text-center m-0 mb-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          MultiStreamDB Chat
        </h1>
        <p className="text-center text-dark-text-secondary m-0 mb-10 text-base">
          Conecte-se aos chats da Twitch, Kick e YouTube
        </p>

        <div className="flex flex-col gap-8 xl:flex-row">
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
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
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

            {/* YouTube Section */}
            <div className="mb-5">
              <div className="flex gap-2.5">
                <button
                  className="flex-1 mb-4 px-6 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-[#ff0000] hover:bg-[#cc0000] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(255,0,0,0.3)] disabled:cursor-not-allowed"
                  onClick={handleYoutubeOAuth}
                  disabled={isLoadingYoutube || youtubeAuthenticated}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a2.974 2.974 0 0 0-2.09-2.103C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.408.537A2.974 2.974 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.974 2.974 0 0 0 2.09 2.103c1.903.537 9.408.537 9.408.537s7.505 0 9.408-.537a2.974 2.974 0 0 0 2.09-2.103C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  {youtubeButtonText()}
                </button>

                {youtubeAuthenticated && (
                  <button
                    onClick={handleYoutubeSignOut}
                    className="mb-4 px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)] w-[120px]"
                    title="Sair do YouTube"
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
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleKickChannelSubmit()
                  }
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
            {widgetUrl && (
              <div className="mt-8 pt-5 border-t-2 border-dark-border animate-slide-down">
                <p className="m-0 mb-2.5 font-bold text-dark-text-primary">
                  URL do Widget(Pode usar no OBS):
                </p>
                <div className="flex flex-col md:flex-row gap-2.5 mb-5">
                  <input
                    type="password"
                    value={widgetUrl}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-dark-border focus:border-green-500 rounded-lg text-sm bg-dark-bg-primary text-dark-text-primary font-mono outline-none"
                  />
                  <button
                    onClick={copyChatUrl}
                    className="w-[120px] bg-green-500 text-white border-0 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(46,204,113,0.3)]"
                  >
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
                    {showCustomization ? "Fechar Edição" : "Editar Chat"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Customization Panel */}
          {showCustomization && widgetUrl && (
            <div className="flex gap-8 bg-dark-bg-card rounded-xl p-6 border border-dark-border">
              <div className="bg-dark-bg-primary rounded-xl p-6 border border-dark-border">
                <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
                  Opções de Personalização
                </h3>

                <div className="flex flex-col gap-4">
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
                        className="h-10 w-10 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={usernameBgColor}
                        onChange={(e) => setUsernameBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <CustomRangeInput
                      min={0}
                      max={1}
                      step={0.01}
                      value={1 - parseFloat(usernameBgAlpha)}
                      onChange={(value) =>
                        setUsernameBgAlpha((1 - value).toString())
                      }
                      label={`Transparência: ${Math.round((1 - parseFloat(usernameBgAlpha)) * 100)}%`}
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
                        className="h-10 w-10 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={messageBgColor}
                        onChange={(e) => setMessageBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <CustomRangeInput
                      min={0}
                      max={1}
                      step={0.01}
                      value={1 - parseFloat(messageBgAlpha)}
                      onChange={(value) =>
                        setMessageBgAlpha((1 - value).toString())
                      }
                      label={`Transparência: ${Math.round((1 - parseFloat(messageBgAlpha)) * 100)}%`}
                    />
                    <div className="mt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fullWidthMessages}
                          onChange={(e) =>
                            setFullWidthMessages(e.target.checked)
                          }
                          className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-purple-500"
                        />
                        <span className="text-sm font-medium text-dark-text-secondary">
                          Mensagens com largura total
                        </span>
                      </label>
                    </div>
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
                        className="h-10 w-10 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
                      />
                      <input
                        type="text"
                        value={messageTextColor}
                        onChange={(e) => setMessageTextColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
                      />
                    </div>
                    <CustomRangeInput
                      min={0}
                      max={1}
                      step={0.01}
                      value={1 - parseFloat(messageTextAlpha)}
                      onChange={(value) =>
                        setMessageTextAlpha((1 - value).toString())
                      }
                      label={`Transparência: ${Math.round((1 - parseFloat(messageTextAlpha)) * 100)}%`}
                    />
                  </div>

                  {/* Username Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Tamanho do Nome
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
                      Tamanho da Mensagem
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

                  {/* Border Radius */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Borda arredondada
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

                  {/* Message Padding */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                      Espacamento da Mensagem
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
                    <CustomRangeInput
                      min={0}
                      max={6}
                      step={0.5}
                      value={parseFloat(messageDelay)}
                      onChange={(value) => setMessageDelay(value.toString())}
                      label={`Delay: ${messageDelay}s (Mods, VIPs e dono do canal não são afetados)`}
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="bg-dark-bg-primary rounded-xl p-4 border border-dark-border h-[360px]">
                <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
                  Preview
                </h3>
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4">
                  <div className="space-y-3 w-[400px]">
                    <MessageRow
                      message={{
                        id: "preview-1",
                        userId: "user1",
                        displayName: "Jorge",
                        displayColor: "#FF6B6B",
                        text: "O maior de todos os tempos",
                        badges: [],
                        emotes: [],
                        isAction: false,
                        timestamp: Date.now(),
                        provider: "twitch",
                        channel: "example",
                        msgId: "msg1",
                      }}
                      hideAfter={180}
                      onRemove={() => {}}
                      customStyles={{
                        usernameBg: hexToRgba(usernameBgColor, usernameBgAlpha),
                        messageBg: hexToRgba(messageBgColor, messageBgAlpha),
                        messageColor: hexToRgba(
                          messageTextColor,
                          messageTextAlpha,
                        ),
                        borderRadius: borderRadius,
                        usernameFontSize: usernameFontSize,
                        messageFontSize: messageFontSize,
                        messagePadding: messagePadding,
                        fullWidthMessages: fullWidthMessages.toString(),
                      }}
                    />
                    <MessageRow
                      message={{
                        id: "preview-2",
                        userId: "user2",
                        displayName: "Bruno",
                        displayColor: "#4ECDC4",
                        text: "A que não sei oq não sei oq lá",
                        badges: [],
                        emotes: [],
                        isAction: false,
                        timestamp: Date.now(),
                        provider: "youtube",
                        channel: "example",
                        msgId: "msg2",
                      }}
                      hideAfter={180}
                      onRemove={() => {}}
                      customStyles={{
                        usernameBg: hexToRgba(usernameBgColor, usernameBgAlpha),
                        messageBg: hexToRgba(messageBgColor, messageBgAlpha),
                        messageColor: hexToRgba(
                          messageTextColor,
                          messageTextAlpha,
                        ),
                        borderRadius: borderRadius,
                        usernameFontSize: usernameFontSize,
                        messageFontSize: messageFontSize,
                        messagePadding: messagePadding,
                        fullWidthMessages: fullWidthMessages.toString(),
                      }}
                    />
                    <MessageRow
                      message={{
                        id: "preview-3",
                        userId: "user3",
                        displayName: "Alanzoka",
                        displayColor: "#b927e6",
                        text: "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
                        badges: [],
                        emotes: [],
                        isAction: false,
                        timestamp: Date.now(),
                        provider: "kick",
                        channel: "example",
                        msgId: "msg3",
                      }}
                      hideAfter={180}
                      onRemove={() => {}}
                      customStyles={{
                        usernameBg: hexToRgba(usernameBgColor, usernameBgAlpha),
                        messageBg: hexToRgba(messageBgColor, messageBgAlpha),
                        messageColor: hexToRgba(
                          messageTextColor,
                          messageTextAlpha,
                        ),
                        borderRadius: borderRadius,
                        usernameFontSize: usernameFontSize,
                        messageFontSize: messageFontSize,
                        messagePadding: messagePadding,
                        fullWidthMessages: fullWidthMessages.toString(),
                      }}
                    />
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
