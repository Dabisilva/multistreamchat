import React from "react";
import type { AppFeature } from "./FeatureNav";

interface WidgetUrlSectionProps {
  activeFeature: AppFeature;
  widgetUrl: string;
  showCustomization: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onToggleCustomization: () => void;
}

export const WidgetUrlSection: React.FC<WidgetUrlSectionProps> = ({
  activeFeature,
  widgetUrl,
  showCustomization,
  onCopy,
  onOpen,
  onToggleCustomization,
}) => {
  if (!widgetUrl) return null;

  return (
    <div className="mt-8 pt-5 border-t-2 border-dark-border animate-slide-down">
      <p className="m-0 mb-2.5 font-bold text-dark-text-primary">
        {activeFeature === "chat"
          ? "URL do Widget (Pode usar no OBS):"
          : "URL do Contador de Views (Pode usar no OBS):"}
      </p>
      <div className="flex flex-col md:flex-row gap-2.5 mb-5">
        <input
          type="password"
          value={widgetUrl}
          readOnly
          className="flex-1 px-4 py-3 border-2 border-dark-border focus:border-green-500 rounded-lg text-sm bg-dark-bg-primary text-dark-text-primary font-mono outline-none"
        />
        <button
          onClick={onCopy}
          className="w-[120px] bg-green-500 text-white border-0 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(46,204,113,0.3)]"
        >
          Copiar
        </button>
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={onOpen}
          className="flex-1 bg-indigo-500 text-white border-0 rounded-lg px-8 py-3.5 text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(102,126,234,0.3)] mt-2.5"
        >
          {activeFeature === "chat" ? "Abrir Chat" : "Abrir Contador"}
        </button>
        <button
          onClick={onToggleCustomization}
          className="flex-1 bg-purple-500 text-white border-0 rounded-lg px-8 py-3.5 text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-purple-600 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(139,92,246,0.3)] mt-2.5"
        >
          {showCustomization
            ? "Fechar Edição"
            : activeFeature === "chat"
              ? "Editar Chat"
              : "Editar Contador"}
        </button>
      </div>
    </div>
  );
};
