import React from "react";
import { useAppDashboard } from "./hooks/useAppDashboard";
import { FeatureNav } from "./components/FeatureNav";
import { PlatformAuthPanel } from "./components/PlatformAuthPanel";
import { WidgetUrlSection } from "./components/WidgetUrlSection";
import { ChatCustomizationPanel } from "./components/ChatCustomizationPanel";
import { ViewerCustomizationPanel } from "./components/ViewerCustomizationPanel";

import "./style.css";

const App: React.FC = () => {
  const {
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
  } = useAppDashboard();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-5 font-sans">
      <div className="bg-dark-bg-secondary rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-10 md:p-6 border border-dark-border">
        <h1 className="text-4xl md:text-3xl font-bold text-center m-0 mb-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          MultiStreamDB Chat
        </h1>
        <p className="text-center text-dark-text-secondary m-0 mb-10 text-base">
          Conecte-se aos chats da Twitch, Kick e YouTube
        </p>

        <div className="flex flex-col gap-8">
          <FeatureNav activeFeature={activeFeature} onChange={switchFeature} />

          <div className="flex flex-col xl:flex-row gap-8 items-start">
            <div className="bg-dark-bg-card rounded-xl p-6 border border-dark-border w-full xl:max-w-md xl:shrink-0">
              <PlatformAuthPanel
                error={error}
                isLoadingTwitch={isLoadingTwitch}
                isLoadingYoutube={isLoadingYoutube}
                twitchAuthenticated={twitchAuthenticated}
                youtubeAuthenticated={youtubeAuthenticated}
                kickChannel={kickChannel}
                kickChannelSaved={kickChannelSaved}
                onTwitchLogin={handleTwitchOAuth}
                onTwitchSignOut={handleTwitchSignOut}
                onYoutubeLogin={handleYoutubeOAuth}
                onYoutubeSignOut={handleYoutubeSignOut}
                onKickChannelChange={setKickChannel}
                onKickChannelSubmit={handleKickChannelSubmit}
                onKickChannelClear={handleKickChannelClear}
              />

              <WidgetUrlSection
                activeFeature={activeFeature}
                widgetUrl={activeWidgetUrl}
                showCustomization={showCustomization}
                onCopy={copyWidgetUrl}
                onOpen={openWidgetPopup}
                onToggleCustomization={() =>
                  setShowCustomization(!showCustomization)
                }
              />
            </div>

            {showCustomization && activeFeature === "chat" && widgetUrl && (
              <ChatCustomizationPanel
                settings={chatSettings}
                onChange={updateChatSetting}
              />
            )}

            {showCustomization &&
              activeFeature === "viewers" &&
              viewerWidgetUrl && (
                <ViewerCustomizationPanel
                  settings={viewerSettings}
                  onChange={updateViewerSetting}
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
