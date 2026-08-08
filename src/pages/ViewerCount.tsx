import React from "react";
import { useViewerCount } from "./useViewerCount";
import {
  formatViewerCount,
  ViewerPlatform,
} from "../services/ViewerCountService";
import { PlatformIcon } from "../components/PlatformIcon";

const PLATFORM_ORDER: ViewerPlatform[] = ["twitch", "youtube", "kick"];

const ViewerCount: React.FC = () => {
  const {
    viewers,
    config,
    loading,
    totalViewers,
    twitchAuthenticated,
    youtubeAuthenticated,
    kickConnected,
  } = useViewerCount();

  const textStyle: React.CSSProperties = {
    fontSize: `${config.fontSize}px`,
    color: config.textColor,
    fontWeight: 700,
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    lineHeight: 1,
    textShadow: "0 2px 8px rgba(0,0,0,0.45)",
    letterSpacing: "0.02em",
  };

  const iconSize = Math.max(Math.round(config.fontSize * 0.9), 16);

  const enabledPlatforms = PLATFORM_ORDER.filter((platform) => {
    if (platform === "twitch")
      return config.showTwitch && twitchAuthenticated;
    if (platform === "youtube")
      return config.showYoutube && youtubeAuthenticated;
    return config.showKick && kickConnected;
  });

  const renderSummed = (count: number) => (
    <div
      className="flex items-center gap-3"
      style={{ color: config.textColor }}
    >
      <div className="flex items-center gap-2">
        {enabledPlatforms.map((platform) => (
          <PlatformIcon
            key={platform}
            platform={platform}
            size={iconSize}
            branded
          />
        ))}
      </div>
      <span style={textStyle}>{formatViewerCount(count)}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center">
        <span style={{ ...textStyle, opacity: 0.6 }}>—</span>
      </div>
    );
  }

  if (config.sumViews) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center">
        {renderSummed(totalViewers)}
      </div>
    );
  }

  if (viewers.length === 0) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center">
        {renderSummed(0)}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-transparent flex items-center justify-center">
      <div className="flex items-center gap-6 flex-wrap justify-center">
        {viewers.map((v) => (
          <div
            key={v.platform}
            className="flex items-center gap-2"
            style={{ color: config.textColor }}
          >
            <PlatformIcon
              platform={v.platform as ViewerPlatform}
              size={iconSize}
              branded
            />
            <span style={textStyle}>{formatViewerCount(v.count ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewerCount;
