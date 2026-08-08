import React from "react";

type IconPlatform = "twitch" | "youtube" | "kick";

interface PlatformIconProps {
  platform: IconPlatform;
  size?: number;
  className?: string;
  /** When true, uses platform brand colors. Otherwise inherits currentColor. */
  branded?: boolean;
}

const BRAND_COLORS: Record<IconPlatform, string> = {
  twitch: "#9146FF",
  youtube: "#FF0000",
  kick: "#53FC18",
};

const PATHS: Record<IconPlatform, string> = {
  twitch:
    "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  youtube:
    "M23.498 6.186a2.974 2.974 0 0 0-2.09-2.103C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.408.537A2.974 2.974 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.974 2.974 0 0 0 2.09 2.103c1.903.537 9.408.537 9.408.537s7.505 0 9.408-.537a2.974 2.974 0 0 0 2.09-2.103C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  kick: "M2 2h6.5v7.2L14.8 2H22l-8.2 8.5L22 22h-7.2l-6.3-8.2V22H2V2z",
};

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 20,
  className,
  branded = false,
}) => {
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
