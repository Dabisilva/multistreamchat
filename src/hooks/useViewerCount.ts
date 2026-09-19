import { useState, useEffect, useRef } from "react";
import OAuthService from "@/services/OAuthService";
import {
  ViewerCountService,
  PlatformViewers,
} from "@/services/ViewerCountService";
import { DEFAULT_VIEWER_SETTINGS } from "@/utils/styleDefaults";
import { scrubSensitiveSearchParams } from "@/utils/sensitiveUrl";
import {
  getInitialOverlayVisibility,
  subscribeOverlayVisibility,
} from "@/utils/overlayVisibility";
import {
  clearYoutubeSession,
  getYoutubeAccessToken,
  getYoutubeChannelId,
  getYoutubeRefreshToken,
  getYoutubeTokenExpiresAt,
  setYoutubeAccessToken,
  setYoutubeChannelId,
  setYoutubeRefreshToken,
  setYoutubeTokenExpiresAt,
} from "@/utils/youtubeStorage";

const POLL_INTERVAL_MS = 60_000;
const TOKEN_REFRESH_THRESHOLD_MS = 600000;

export interface ViewerCountConfig {
  viewerFontSize: number;
  showTwitch: boolean;
  showKick: boolean;
  showYoutube: boolean;
  sumViews: boolean;
  viewerTextColor: string;
}

const DEFAULT_CONFIG: ViewerCountConfig = {
  viewerFontSize: Number(DEFAULT_VIEWER_SETTINGS.viewerFontSize),
  showTwitch: DEFAULT_VIEWER_SETTINGS.showTwitch,
  showKick: DEFAULT_VIEWER_SETTINGS.showKick,
  showYoutube: DEFAULT_VIEWER_SETTINGS.showYoutube,
  sumViews: DEFAULT_VIEWER_SETTINGS.sumViews,
  viewerTextColor: DEFAULT_VIEWER_SETTINGS.viewerTextColor,
};

function sameViewers(a: PlatformViewers[], b: PlatformViewers[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, index) =>
      item.platform === b[index].platform &&
      item.count === b[index].count &&
      item.isLive === b[index].isLive &&
      item.error === b[index].error,
  );
}

export const useViewerCount = () => {
  const [viewers, setViewers] = useState<PlatformViewers[]>([]);
  const [config, setConfig] = useState<ViewerCountConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [twitchAuthenticated, setTwitchAuthenticated] = useState(false);
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(false);
  const [kickConnected, setKickConnected] = useState(false);
  const [ready, setReady] = useState(false);

  const serviceRef = useRef<ViewerCountService | null>(null);
  const lastViewersRef = useRef<PlatformViewers[]>([]);
  const credentialsRef = useRef({
    twitchChannel: "",
    twitchToken: "",
    clientId: "",
    kickChannel: "",
    youtubeChannelId: "",
    youtubeToken: "",
  });

  const refreshTwitchTokenIfNeeded = async (
    force = false,
  ): Promise<string | null> => {
    const twitchToken = localStorage.getItem("twitchToken");
    const refreshToken = localStorage.getItem("twitchRefreshToken");
    const expiresAt = localStorage.getItem("twitchTokenExpiresAt");

    if (!twitchToken || !refreshToken) return twitchToken;

    const shouldRefresh =
      force ||
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
      return null;
    }
  };

  const refreshYoutubeTokenIfNeeded = async (
    force = false,
  ): Promise<string | null> => {
    const youtubeToken = getYoutubeAccessToken();
    const refreshToken = getYoutubeRefreshToken();
    const expiresAt = getYoutubeTokenExpiresAt();

    if (!youtubeToken || !refreshToken) return youtubeToken;

    const shouldRefresh =
      force ||
      !expiresAt ||
      parseInt(expiresAt) - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

    if (!shouldRefresh) return youtubeToken;

    try {
      const tokenResponse =
        await OAuthService.refreshYoutubeToken(refreshToken);
      const newExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
      setYoutubeAccessToken(tokenResponse.access_token);
      setYoutubeTokenExpiresAt(newExpiresAt);
      if (tokenResponse.refresh_token) {
        setYoutubeRefreshToken(tokenResponse.refresh_token);
      }
      credentialsRef.current.youtubeToken = tokenResponse.access_token;
      return tokenResponse.access_token;
    } catch {
      clearYoutubeSession();
      credentialsRef.current.youtubeToken = "";
      credentialsRef.current.youtubeChannelId = "";
      serviceRef.current?.resetYoutube();
      setYoutubeAuthenticated(false);
      return null;
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
      viewerFontSize: params.get("viewerFontSize"),
      showTwitch: params.get("showTwitch"),
      showKick: params.get("showKick"),
      showYoutube: params.get("showYoutube"),
      sumViews: params.get("sumViews"),
      viewerTextColor: params.get("viewerTextColor"),
    };
  };

  useEffect(() => {
    const urlParams = parseUrlParams();

    setConfig({
      viewerFontSize: urlParams.viewerFontSize
        ? parseInt(urlParams.viewerFontSize, 10) || DEFAULT_CONFIG.viewerFontSize
        : DEFAULT_CONFIG.viewerFontSize,
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
      viewerTextColor:
        urlParams.viewerTextColor || DEFAULT_CONFIG.viewerTextColor,
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
      setYoutubeAccessToken(urlParams.youtubeToken);
      if (urlParams.youtubeRefreshToken)
        setYoutubeRefreshToken(urlParams.youtubeRefreshToken);
      if (urlParams.youtubeExpiresAt)
        setYoutubeTokenExpiresAt(urlParams.youtubeExpiresAt);
      if (urlParams.youtubeChannelId)
        setYoutubeChannelId(urlParams.youtubeChannelId);
    } else {
      const youtubeToken = getYoutubeAccessToken();
      credentialsRef.current.youtubeToken = youtubeToken || "";
      credentialsRef.current.youtubeChannelId = getYoutubeChannelId() || "";
    }

    if (
      urlParams.twitchToken ||
      urlParams.refreshToken ||
      urlParams.youtubeToken ||
      urlParams.youtubeRefreshToken
    ) {
      scrubSensitiveSearchParams();
    }

    let cancelled = false;

    const start = async () => {
      const twitchToken = await refreshTwitchTokenIfNeeded(true);
      const youtubeToken = await refreshYoutubeTokenIfNeeded(true);
      if (cancelled) return;

      if (twitchToken) credentialsRef.current.twitchToken = twitchToken;
      if (youtubeToken) credentialsRef.current.youtubeToken = youtubeToken;

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
        onTwitchTokenRefresh: () => refreshTwitchTokenIfNeeded(true),
        onYoutubeTokenRefresh: () => refreshYoutubeTokenIfNeeded(true),
      });
      setReady(true);
    };

    void start();

    return () => {
      cancelled = true;
      serviceRef.current?.abortInFlight();
      serviceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let overlayVisible = getInitialOverlayVisibility();

    const poll = async () => {
      if (cancelled || inFlight || !serviceRef.current) return;
      if (!overlayVisible) return;
      inFlight = true;

      serviceRef.current.updateCredentials({
        ...credentialsRef.current,
        onTwitchTokenRefresh: () => refreshTwitchTokenIfNeeded(true),
        onYoutubeTokenRefresh: () => refreshYoutubeTokenIfNeeded(true),
      });

      try {
        const results = await serviceRef.current.fetchAll({
          twitch: config.showTwitch,
          kick: config.showKick,
          youtube: config.showYoutube,
        });

        if (!cancelled) {
          if (!sameViewers(lastViewersRef.current, results)) {
            lastViewersRef.current = results;
            setViewers(results);
          }
          setLoading(false);
        }
      } finally {
        inFlight = false;
      }
    };

    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    const handleVisibility = (visible: boolean) => {
      overlayVisible = visible;
      if (!visible) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }
      void poll();
      startInterval();
    };

    void poll();
    if (overlayVisible) {
      startInterval();
    }

    const unsubscribeOverlay = subscribeOverlayVisibility(handleVisibility);

    return () => {
      cancelled = true;
      unsubscribeOverlay();
      if (intervalId) clearInterval(intervalId);
      serviceRef.current?.abortInFlight();
    };
  }, [ready, config.showTwitch, config.showKick, config.showYoutube]);

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
