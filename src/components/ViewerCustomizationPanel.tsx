import React, { useState } from "react";
import CustomRangeInput from "./CustomRangeInput";
import { ColorField } from "./ColorField";
import { PlatformIcon } from "./PlatformIcon";
import type { ViewerCustomizationSettings } from "../utils/widgetUrl";
import { formatViewerCount } from "../services/ViewerCountService";

interface ViewerCustomizationPanelProps {
  settings: ViewerCustomizationSettings;
  onChange: <K extends keyof ViewerCustomizationSettings>(
    key: K,
    value: ViewerCustomizationSettings[K],
  ) => void;
  twitchAuthenticated: boolean;
  youtubeAuthenticated: boolean;
  kickConnected: boolean;
}

const PreviewCount: React.FC<{
  platform: "twitch" | "youtube" | "kick";
  count: string;
  viewerFontSize: string;
  viewerTextColor: string;
}> = ({ platform, count, viewerFontSize, viewerTextColor }) => {
  const iconSize = Math.max(
    Math.round(parseInt(viewerFontSize, 10) * 0.7) || 22,
    16,
  );

  return (
    <div className="flex items-center gap-2" style={{ color: viewerTextColor }}>
      <PlatformIcon platform={platform} size={iconSize} branded />
      <span
        style={{
          fontSize: `${viewerFontSize}px`,
          fontWeight: 700,
          color: viewerTextColor,
          lineHeight: 1,
          textShadow: "0 2px 8px rgba(0,0,0,0.45)",
        }}
      >
        {count}
      </span>
    </div>
  );
};

type PlatformKey = "twitch" | "youtube" | "kick";

const LOGIN_MESSAGES: Record<PlatformKey, string> = {
  twitch: "Faça login na Twitch para usar essa opção.",
  youtube: "Faça login no YouTube para usar essa opção.",
  kick: "Conecte um canal da Kick para usar essa opção.",
};

export const ViewerCustomizationPanel: React.FC<
  ViewerCustomizationPanelProps
> = ({
  settings,
  onChange,
  twitchAuthenticated,
  youtubeAuthenticated,
  kickConnected,
}) => {
  const [platformHint, setPlatformHint] = useState("");

  const iconSize = Math.max(
    Math.round(parseInt(settings.viewerFontSize, 10) * 0.9) || 22,
    16,
  );

  const connected: Record<PlatformKey, boolean> = {
    twitch: twitchAuthenticated,
    youtube: youtubeAuthenticated,
    kick: kickConnected,
  };

  const handlePlatformToggle = (
    platform: PlatformKey,
    key: "showTwitch" | "showYoutube" | "showKick",
    checked: boolean,
  ) => {
    if (checked && !connected[platform]) {
      setPlatformHint(LOGIN_MESSAGES[platform]);
      onChange(key, false);
      return;
    }

    setPlatformHint("");
    onChange(key, checked);
  };

  const showTwitch = settings.showTwitch && twitchAuthenticated;
  const showYoutube = settings.showYoutube && youtubeAuthenticated;
  const showKick = settings.showKick && kickConnected;

  const sumPreviewCount =
    (showTwitch ? 1200 : 0) + (showYoutube ? 850 : 0) + (showKick ? 340 : 0);

  return (
    <div className="flex gap-8 bg-dark-bg-card rounded-xl p-6 border border-dark-border">
      <div className="bg-dark-bg-primary rounded-xl p-6 border border-dark-border min-w-[280px]">
        <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
          Opções do Contador
        </h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Tamanho da fonte
            </label>
            <input
              type="number"
              min="16"
              max="96"
              value={settings.viewerFontSize}
              onChange={(e) => onChange("viewerFontSize", e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
            />
            <CustomRangeInput
              min={16}
              max={96}
              step={1}
              value={parseInt(settings.viewerFontSize, 10) || 32}
              onChange={(value) =>
                onChange("viewerFontSize", String(Math.round(value)))
              }
              label={`${settings.viewerFontSize}px`}
            />
          </div>

          <ColorField
            label="Cor do texto"
            color={settings.viewerTextColor}
            onColorChange={(value) => onChange("viewerTextColor", value)}
          />

          <div className="pt-2 border-t border-dark-border">
            <p className="text-sm font-medium text-dark-text-secondary mb-3">
              Plataformas
            </p>
            <div className="flex flex-col gap-3">
              <label
                className={`flex items-center gap-2 cursor-pointer ${
                  !twitchAuthenticated ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={showTwitch}
                  onChange={(e) =>
                    handlePlatformToggle("twitch", "showTwitch", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-purple-500"
                />
                <span className="text-sm font-medium text-dark-text-secondary">
                  Twitch
                  {!twitchAuthenticated && (
                    <span className="text-dark-text-muted font-normal">
                      {" "}
                      (não conectado)
                    </span>
                  )}
                </span>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer ${
                  !youtubeAuthenticated ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={showYoutube}
                  onChange={(e) =>
                    handlePlatformToggle(
                      "youtube",
                      "showYoutube",
                      e.target.checked,
                    )
                  }
                  className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-red-500"
                />
                <span className="text-sm font-medium text-dark-text-secondary">
                  YouTube
                  {!youtubeAuthenticated && (
                    <span className="text-dark-text-muted font-normal">
                      {" "}
                      (não conectado)
                    </span>
                  )}
                </span>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer ${
                  !kickConnected ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={showKick}
                  onChange={(e) =>
                    handlePlatformToggle("kick", "showKick", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-green-500"
                />
                <span className="text-sm font-medium text-dark-text-secondary">
                  Kick
                  {!kickConnected && (
                    <span className="text-dark-text-muted font-normal">
                      {" "}
                      (não conectado)
                    </span>
                  )}
                </span>
              </label>
            </div>
            {platformHint && (
              <p
                className="mt-3 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2 cursor-pointer"
                onClick={() => setPlatformHint("")}
              >
                {platformHint}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-dark-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sumViews}
                onChange={(e) => onChange("sumViews", e.target.checked)}
                className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-indigo-500"
              />
              <span className="text-sm font-medium text-dark-text-secondary">
                Somar todas as views
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-dark-bg-primary rounded-xl p-4 border border-dark-border min-w-[320px]">
        <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
          Preview
        </h3>
        <div className="bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#1a1a1a_0%_50%)_50%/20px_20px] rounded-lg p-8 flex items-center justify-center min-h-[160px]">
          {settings.sumViews ? (
            <div
              className="flex items-center gap-3"
              style={{ color: settings.viewerTextColor }}
            >
              <div className="flex items-center gap-2">
                {showTwitch && (
                  <PlatformIcon platform="twitch" size={iconSize} branded />
                )}
                {showYoutube && (
                  <PlatformIcon platform="youtube" size={iconSize} branded />
                )}
                {showKick && (
                  <PlatformIcon platform="kick" size={iconSize} branded />
                )}
              </div>
              <span
                style={{
                  fontSize: `${settings.viewerFontSize}px`,
                  fontWeight: 700,
                  color: settings.viewerTextColor,
                  lineHeight: 1,
                  textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                }}
              >
                {formatViewerCount(sumPreviewCount)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-5 flex-wrap justify-center">
              {showTwitch && (
                <PreviewCount
                  platform="twitch"
                  count="1.200"
                  viewerFontSize={settings.viewerFontSize}
                  viewerTextColor={settings.viewerTextColor}
                />
              )}
              {showYoutube && (
                <PreviewCount
                  platform="youtube"
                  count="850"
                  viewerFontSize={settings.viewerFontSize}
                  viewerTextColor={settings.viewerTextColor}
                />
              )}
              {showKick && (
                <PreviewCount
                  platform="kick"
                  count="340"
                  viewerFontSize={settings.viewerFontSize}
                  viewerTextColor={settings.viewerTextColor}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
