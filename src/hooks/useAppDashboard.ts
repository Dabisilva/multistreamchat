import { useState, useEffect, useRef } from "react";
import OAuthService from "../services/OAuthService";
import type { AppFeature } from "../components/FeatureNav";
import {
  buildChatWidgetUrl,
  buildViewerWidgetUrl,
  type ChatCustomizationSettings,
  type ViewerCustomizationSettings,
} from "../utils/widgetUrl";

const baseUrl = window.location.origin;

const DEFAULT_CHAT_SETTINGS: ChatCustomizationSettings = {
  usernameBgColor: "#30034d",
  messageBgColor: "#8b5cf6",
  messageTextColor: "#ffffff",
  usernameBgAlpha: "0",
  messageBgAlpha: "0",
  messageTextAlpha: "1",
  borderRadius: "4",
  usernameFontSize: "20",
  messageFontSize: "20",
  messagePadding: "0",
  messageDelay: "5",
  fullWidthMessages: false,
};

const DEFAULT_VIEWER_SETTINGS: ViewerCustomizationSettings = {
  viewerFontSize: "32",
  viewerTextColor: "#ffffff",
  showTwitchViews: true,
  showKickViews: true,
  showYoutubeViews: true,
  sumViews: false,
};

export function useAppDashboard() {
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
  const [viewerWidgetUrl, setViewerWidgetUrl] = useState("");
  const [showCustomization, setShowCustomization] = useState(false);
  const [activeFeature, setActiveFeature] = useState<AppFeature>("chat");
  const [chatSettings, setChatSettings] = useState(DEFAULT_CHAT_SETTINGS);
  const [viewerSettings, setViewerSettings] = useState(DEFAULT_VIEWER_SETTINGS);

  const refreshWidgetUrl = (
    nextChat = chatSettings,
    nextViewer = viewerSettings,
  ) => {
    setWidgetUrl(buildChatWidgetUrl(baseUrl, nextChat));
    setViewerWidgetUrl(buildViewerWidgetUrl(baseUrl, nextViewer));
  };

  const updateChatSetting = <K extends keyof ChatCustomizationSettings>(
    key: K,
    value: ChatCustomizationSettings[K],
  ) => {
    setChatSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateViewerSetting = <K extends keyof ViewerCustomizationSettings>(
    key: K,
    value: ViewerCustomizationSettings[K],
  ) => {
    setViewerSettings((prev) => ({ ...prev, [key]: value }));
  };

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

  const processYoutubeOAuthCallback = async (code: string, state: string) => {
    try {
      const tokenResponse = await OAuthService.handleOAuthCallback(
        "youtube",
        code,
        state,
      );

      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

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

  const refreshTwitchTokenIfNeeded = async (): Promise<string | null> => {
    const twitchToken = localStorage.getItem("twitchToken");
    const refreshToken = localStorage.getItem("twitchRefreshToken");
    const expiresAt = localStorage.getItem("twitchTokenExpiresAt");

    if (!twitchToken || !refreshToken) return null;

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
      } catch {
        handleTwitchSignOut();
        setError(
          "Sua sessão da Twitch expirou. Por favor, faça login novamente.",
        );
        return null;
      }
    }

    return twitchToken;
  };

  const refreshYoutubeTokenIfNeeded = async (): Promise<string | null> => {
    const youtubeToken = localStorage.getItem("youtubeToken");
    const refreshToken = localStorage.getItem("youtubeRefreshToken");
    const expiresAt = localStorage.getItem("youtubeTokenExpiresAt");

    if (!youtubeToken || !refreshToken) return null;

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
      } catch {
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
        const handledKey = `oauth_code_handled_${code.slice(0, 24)}`;
        if (!sessionStorage.getItem(handledKey)) {
          sessionStorage.setItem(handledKey, "1");

          const platform =
            OAuthService.detectOAuthPlatform(state) ||
            (scope.includes("youtube") ? "youtube" : null);

          window.history.replaceState({}, document.title, "/");

          if (platform === "twitch") {
            setIsLoadingTwitch(true);
            try {
              await processTwitchOAuthCallback(code, state);
            } catch {
              // Error already handled
            } finally {
              setIsLoadingTwitch(false);
            }
          } else if (platform === "youtube") {
            setIsLoadingYoutube(true);
            try {
              await processYoutubeOAuthCallback(code, state);
            } catch {
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
        if (validToken) setTwitchAuthenticated(true);
      }

      if (youtubeToken && youtubeUser) {
        const validToken = await refreshYoutubeTokenIfNeeded();
        if (validToken) setYoutubeAuthenticated(true);
      } else if (youtubeToken && !youtubeUser) {
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

  useEffect(() => {
    refreshWidgetUrl(chatSettings, viewerSettings);
  }, [
    chatSettings,
    viewerSettings,
    twitchAuthenticated,
    youtubeAuthenticated,
    kickChannelSaved,
  ]);

  const handleTwitchOAuth = async () => {
    setIsLoadingTwitch(true);
    setError("");
    try {
      await OAuthService.initiateTwitchOAuth();
    } catch {
      setError("Erro ao iniciar autenticação com Twitch");
      setIsLoadingTwitch(false);
    }
  };

  const handleYoutubeOAuth = async () => {
    setIsLoadingYoutube(true);
    setError("");
    try {
      await OAuthService.initiateYoutubeOAuth();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao iniciar autenticação com YouTube",
      );
      setIsLoadingYoutube(false);
    }
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

  const activeWidgetUrl =
    activeFeature === "chat" ? widgetUrl : viewerWidgetUrl;

  const openWidgetPopup = () => {
    const width = activeFeature === "chat" ? 480 : 520;
    const height = activeFeature === "chat" ? 800 : 200;
    const left = window.screen.width - width;
    const top = 400;

    window
      .open(
        activeWidgetUrl,
        activeFeature === "chat" ? "ChatWidget" : "ViewerCountWidget",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,addressbar=no`,
      )
      ?.focus();
  };

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(activeWidgetUrl).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = activeWidgetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.body.removeChild(textArea);
    });
  };

  const switchFeature = (feature: AppFeature) => {
    setActiveFeature(feature);
    setShowCustomization(false);
  };

  return {
    error,
    isLoadingTwitch,
    isLoadingYoutube,
    twitchAuthenticated,
    youtubeAuthenticated,
    kickChannel,
    kickChannelSaved,
    setKickChannel,
    activeFeature,
    showCustomization,
    setShowCustomization,
    chatSettings,
    viewerSettings,
    widgetUrl,
    viewerWidgetUrl,
    activeWidgetUrl,
    updateChatSetting,
    updateViewerSetting,
    switchFeature,
    handleTwitchOAuth,
    handleTwitchSignOut,
    handleYoutubeOAuth,
    handleYoutubeSignOut,
    handleKickChannelSubmit,
    handleKickChannelClear,
    openWidgetPopup,
    copyWidgetUrl,
  };
}
