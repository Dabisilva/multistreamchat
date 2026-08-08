import React from "react";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformAuthPanelProps {
  error: string;
  isLoadingTwitch: boolean;
  isLoadingYoutube: boolean;
  twitchAuthenticated: boolean;
  youtubeAuthenticated: boolean;
  kickChannel: string;
  kickChannelSaved: boolean;
  onTwitchLogin: () => void;
  onTwitchSignOut: () => void;
  onYoutubeLogin: () => void;
  onYoutubeSignOut: () => void;
  onKickChannelChange: (value: string) => void;
  onKickChannelSubmit: () => void;
  onKickChannelClear: () => void;
}

const signOutButtonClass =
  "mb-4 px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)] w-[120px]";

export const PlatformAuthPanel: React.FC<PlatformAuthPanelProps> = ({
  error,
  isLoadingTwitch,
  isLoadingYoutube,
  twitchAuthenticated,
  youtubeAuthenticated,
  kickChannel,
  kickChannelSaved,
  onTwitchLogin,
  onTwitchSignOut,
  onYoutubeLogin,
  onYoutubeSignOut,
  onKickChannelChange,
  onKickChannelSubmit,
  onKickChannelClear,
}) => {
  const twitchLabel = isLoadingTwitch
    ? "Carregando..."
    : twitchAuthenticated
      ? "Conectado"
      : "Login Twitch";

  const youtubeLabel = isLoadingYoutube
    ? "Carregando..."
    : youtubeAuthenticated
      ? "Conectado"
      : "Login YouTube";

  return (
    <>
      {error && (
        <div className="bg-red-900/20 text-red-400 p-4 rounded-lg mb-5 border border-red-800">
          {error}
        </div>
      )}

      <div className="mb-5">
        <div className="flex gap-2.5">
          <button
            className="flex-1 mb-4 px-6 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(145,70,255,0.3)] disabled:cursor-not-allowed"
            onClick={onTwitchLogin}
            disabled={isLoadingTwitch || twitchAuthenticated}
          >
            <PlatformIcon platform="twitch" size={20} className="w-5 h-5" />
            {twitchLabel}
          </button>

          {twitchAuthenticated && (
            <button
              onClick={onTwitchSignOut}
              className={signOutButtonClass}
              title="Sair do Twitch"
            >
              Sair
            </button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <div className="flex gap-2.5">
          <button
            className="flex-1 mb-4 px-6 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-[#ff0000] hover:bg-[#cc0000] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(255,0,0,0.3)] disabled:cursor-not-allowed"
            onClick={onYoutubeLogin}
            disabled={isLoadingYoutube || youtubeAuthenticated}
          >
            <PlatformIcon platform="youtube" size={20} className="w-5 h-5" />
            {youtubeLabel}
          </button>

          {youtubeAuthenticated && (
            <button
              onClick={onYoutubeSignOut}
              className={signOutButtonClass}
              title="Sair do YouTube"
            >
              Sair
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block mb-2 text-dark-text-primary font-medium text-sm">
          Canal da Kick
        </label>
        <div className="flex gap-2.5">
          <input
            type="text"
            value={kickChannel}
            onChange={(e) => onKickChannelChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onKickChannelSubmit()}
            placeholder="Digite o nome do canal"
            className="flex-1 px-4 py-3 bg-dark-bg-primary border-2 border-dark-border focus:border-green-500 rounded-lg text-base text-dark-text-primary placeholder-dark-text-muted outline-none transition-colors duration-300"
          />

          {!kickChannelSaved ? (
            <button
              onClick={onKickChannelSubmit}
              className="w-[120px] px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-black bg-[#53fc18] hover:bg-[#42d914] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(83,252,24,0.3)]"
            >
              Confirmar
            </button>
          ) : (
            <button
              onClick={onKickChannelClear}
              className="w-[120px] px-6 py-3.5 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 text-white bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)]"
              title="Limpar canal"
            >
              Limpar
            </button>
          )}
        </div>
      </div>
    </>
  );
};
