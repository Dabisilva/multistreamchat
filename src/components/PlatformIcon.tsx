import React from "react";
import {
  YOUTUBE_ALMOST_BLACK,
  YOUTUBE_ICON_BODY_PATH,
  YOUTUBE_ICON_MIN_SIZE,
  YOUTUBE_ICON_TRIANGLE_PATH,
  YOUTUBE_ICON_VIEWBOX_HEIGHT,
  YOUTUBE_ICON_VIEWBOX_WIDTH,
  YOUTUBE_RED,
  YOUTUBE_WHITE,
  youtubeIconDimensions,
  type YoutubeIconVariant,
} from "@/utils/youtubeBrand";

type IconPlatform = "twitch" | "youtube" | "kick";

interface PlatformIconProps {
  platform: IconPlatform;
  size?: number;
  className?: string;
  /**
   * Twitch/Kick: use brand fill instead of currentColor.
   * YouTube: ignored for recoloring. Use `youtubeVariant` for approved colorways.
   */
  branded?: boolean;
  /** Approved YouTube colorways only. Never recolor via currentColor. */
  youtubeVariant?: YoutubeIconVariant;
}

const BRAND_COLORS: Record<Exclude<IconPlatform, "youtube">, string> = {
  twitch: "#9146FF",
  kick: "#53FC18",
};

const PATHS: Record<Exclude<IconPlatform, "youtube">, string> = {
  twitch:
    "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  kick: "M2 2h6.5v7.2L14.8 2H22l-8.2 8.5L22 22h-7.2l-6.3-8.2V22H2V2z",
};

const YoutubeIcon: React.FC<{
  size: number;
  className?: string;
  variant: YoutubeIconVariant;
}> = ({ size, className, variant }) => {
  const { width, height } = youtubeIconDimensions(size);
  const bodyFill = variant === "black" ? YOUTUBE_ALMOST_BLACK : YOUTUBE_RED;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${YOUTUBE_ICON_VIEWBOX_WIDTH} ${YOUTUBE_ICON_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ width, height, flexShrink: 0, display: "block" }}
    >
      {variant === "white" ? (
        <path
          d={`${YOUTUBE_ICON_BODY_PATH} ${YOUTUBE_ICON_TRIANGLE_PATH}`}
          fill={YOUTUBE_WHITE}
          fillRule="evenodd"
        />
      ) : (
        <>
          <path d={YOUTUBE_ICON_BODY_PATH} fill={bodyFill} />
          <path d={YOUTUBE_ICON_TRIANGLE_PATH} fill={YOUTUBE_WHITE} />
        </>
      )}
    </svg>
  );
};

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 20,
  className,
  branded = false,
  youtubeVariant,
}) => {
  if (platform === "youtube") {
    const variant: YoutubeIconVariant =
      youtubeVariant || (branded ? "full-color" : "white");
    return (
      <YoutubeIcon
        size={Math.max(size, YOUTUBE_ICON_MIN_SIZE)}
        className={className}
        variant={variant}
      />
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={branded ? BRAND_COLORS[platform] : "currentColor"}
      aria-hidden
    >
      <path d={PATHS[platform]} />
    </svg>
  );
};
