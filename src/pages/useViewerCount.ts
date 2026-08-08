import { useState, useEffect, useRef } from "react";
import OAuthService from "../services/OAuthService";
import {
  ViewerCountService,
  PlatformViewers,
} from "../services/ViewerCountService";

const POLL_INTERVAL_MS = 15000;
const TOKEN_REFRESH_THRESHOLD_MS = 600000;

export interface ViewerCountConfig {
  fontSize: number;
  showTwitch: boolean;
  showKick: boolean;
  showYoutube: boolean;
  sumViews: boolean;
  textColor: string;
}

const DEFAULT_CONFIG: ViewerCountConfig = {
  fontSize: 32,
  showTwitch: true,
  showKick: true,
  showYoutube: true,
  sumViews: true,
  textColor: "#ffffff",
};

export const useViewerCount = () => {
  const [viewers, setViewers] = useState<PlatformViewers[]>([]);
  const [config, setConfig] = useState<ViewerCountConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [twitchAuthenticated, setTwitchAuthenticated] = useState(false);
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(false);
  const [kickConnected, setKickConnected] = useState(false);

  const serviceRef = useRef<ViewerCountService | null>(null);
  const credentialsRef = useRef({
    twitchChannel: "",
    twitchToken: "",
    clientId: "",
    kickChannel: "",
    youtubeChannelId: "",
    youtubeToken: "",
  });

  const refreshTwitchTokenIfNeeded = async (): Promise<string | null> => {
    const twitchToken = localStorage.getItem("twitchToken");
    const refreshToken = localStorage.getItem("twitchRefreshToken");
    const expiresAt = localStorage.getItem("twitchTokenExpiresAt");

    if (!twitchToken || !refreshToken) return twitchToken;

    const shouldRefresh =
      !expiresAt ||
      parseInt(expiresAt) - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

    if (!shouldRefresh) return twitchToken;

    try {
      const tokenResponse = await OAuthService.refreshTwitchToken(refreshToken);
      const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
      localStorage.setItem("twitchToken", tokenResponse.access_token);
      localStorage.setItem("twitchTokenExpiresAt", newExpiresAt.toString());
      if (tokenResponse.refresh_token) {
        localStorage.setItem("twitchRefreshToken", tokenResponse.refresh_token);
      }
      credentialsRef.current.twitchToken = tokenResponse.access_token;
      return tokenResponse.access_token;
    } catch {
      return twitchToken;
    }
  };

  const refreshYoutubeTokenIfNeeded = async (): Promise<string | null> => {
    const youtubeToken = localStorage.getItem("youtubeToken");
    const refreshToken = localStorage.getItem("youtubeRefreshToken");
    const expiresAt = localStorage.getItem("youtubeTokenExpiresAt");

    if (!youtubeToken || !refreshToken) return youtubeToken;

    const shouldRefresh =
      !expiresAt ||
      parseInt(expiresAt) - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

    if (!shouldRefresh) return youtubeToken;

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
      credentialsRef.current.youtubeToken = tokenResponse.access_token;
      return tokenResponse.access_token;
    } catch {
      return youtubeToken;
    }
  };

  const parseUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      twitchChannel: params.get("twitchChannel") || "",
      twitchToken: params.get("twitchToken") || "",
      clientId: params.get("clientId") || "",
      refreshToken: params.get("refreshToken"),
      expiresAt: params.get("expiresAt"),
      kickChannel: params.get("kickChannel") || "",
      youtubeChannel: params.get("youtubeChannel") || "",
      youtubeToken: params.get("youtubeToken") || "",
      youtubeChannelId: params.get("youtubeChannelId") || "",
      youtubeRefreshToken: params.get("youtubeRefreshToken"),
      youtubeExpiresAt: params.get("youtubeExpiresAt"),
      fontSize: params.get("viewerFontSize"),
      showTwitch: params.get("showTwitch"),
      showKick: params.get("showKick"),
      showYoutube: params.get("showYoutube"),
      sumViews: params.get("sumViews"),
      textColor: params.get("viewerTextColor"),
    };
  };

  useEffect(() => {
    const urlParams = parseUrlParams();

    setConfig({
      fontSize: urlParams.fontSize
        ? parseInt(urlParams.fontSize, 10) || DEFAULT_CONFIG.fontSize
        : DEFAULT_CONFIG.fontSize,
      showTwitch:
        urlParams.showTwitch !== null
          ? urlParams.showTwitch !== "false"
          : DEFAULT_CONFIG.showTwitch,
      showKick:
        urlParams.showKick !== null
          ? urlParams.showKick !== "false"
          : DEFAULT_CONFIG.showKick,
      showYoutube:
        urlParams.showYoutube !== null
          ? urlParams.showYoutube !== "false"
          : DEFAULT_CONFIG.showYoutube,
      sumViews:
        urlParams.sumViews !== null
          ? urlParams.sumViews !== "false"
          : DEFAULT_CONFIG.sumViews,
      textColor: urlParams.textColor || DEFAULT_CONFIG.textColor,
    });

    if (urlParams.twitchChannel && urlParams.twitchToken) {
      credentialsRef.current.twitchChannel = urlParams.twitchChannel;
      credentialsRef.current.twitchToken = urlParams.twitchToken;
      if (urlParams.clientId)
        credentialsRef.current.clientId = urlParams.clientId;
      localStorage.setItem("twitchToken", urlParams.twitchToken);
      if (urlParams.refreshToken)
        localStorage.setItem("twitchRefreshToken", urlParams.refreshToken);
      if (urlParams.expiresAt)
        localStorage.setItem("twitchTokenExpiresAt", urlParams.expiresAt);
      if (urlParams.clientId)
        localStorage.setItem("twitchClientId", urlParams.clientId);
    } else {
      const twitchToken = localStorage.getItem("twitchToken");
      const twitchInfo = localStorage.getItem("twitchChannelInfo");
      if (twitchToken && twitchInfo) {
        try {
          const info = JSON.parse(twitchInfo);
          credentialsRef.current.twitchChannel = info.username || "";
          credentialsRef.current.twitchToken = twitchToken;
          credentialsRef.current.clientId =
            localStorage.getItem("twitchClientId") || "";
        } catch {
          // ignore
        }
      }
    }

    if (urlParams.kickChannel) {
      credentialsRef.current.kickChannel = urlParams.kickChannel;
    } else {
      credentialsRef.current.kickChannel =
        localStorage.getItem("kickChannel") || "";
    }

    if (urlParams.youtubeToken) {
      credentialsRef.current.youtubeToken = urlParams.youtubeToken;
      credentialsRef.current.youtubeChannelId =
        urlParams.youtubeChannelId || "";
      localStorage.setItem("youtubeToken", urlParams.youtubeToken);
      if (urlParams.youtubeRefreshToken)
        localStorage.setItem(
          "youtubeRefreshToken",
          urlParams.youtubeRefreshToken,
        );
      if (urlParams.youtubeExpiresAt)
        localStorage.setItem(
          "youtubeTokenExpiresAt",
          urlParams.youtubeExpiresAt,
        );
      if (urlParams.youtubeChannelId)
        localStorage.setItem("youtubeChannelId", urlParams.youtubeChannelId);
    } else {
      const youtubeToken = localStorage.getItem("youtubeToken");
      credentialsRef.current.youtubeToken = youtubeToken || "";
      credentialsRef.current.youtubeChannelId =
        localStorage.getItem("youtubeChannelId") || "";
    }

    setTwitchAuthenticated(
      !!(
        credentialsRef.current.twitchChannel &&
        credentialsRef.current.twitchToken
      ),
    );
    setYoutubeAuthenticated(!!credentialsRef.current.youtubeToken);
    setKickConnected(!!credentialsRef.current.kickChannel);

    serviceRef.current = new ViewerCountService({
      ...credentialsRef.current,
      onTwitchTokenRefresh: refreshTwitchTokenIfNeeded,
      onYoutubeTokenRefresh: refreshYoutubeTokenIfNeeded,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (!serviceRef.current) return;

      serviceRef.current.updateCredentials({
        ...credentialsRef.current,
        onTwitchTokenRefresh: refreshTwitchTokenIfNeeded,
        onYoutubeTokenRefresh: refreshYoutubeTokenIfNeeded,
      });

      const results = await serviceRef.current.fetchAll({
        twitch: config.showTwitch,
        kick: config.showKick,
        youtube: config.showYoutube,
      });

      if (!cancelled) {
        setViewers(results);
        setLoading(false);
      }
    };

    void poll();
    intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [config.showTwitch, config.showKick, config.showYoutube]);

  const totalViewers = viewers
    .filter((v) => v.isLive)
    .reduce((sum, v) => sum + (v.count ?? 0), 0);

  return {
    viewers,
    config,
    loading,
    totalViewers,
    twitchAuthenticated,
    youtubeAuthenticated,
    kickConnected,
  };
};
