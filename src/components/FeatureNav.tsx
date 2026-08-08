import React from "react";

export type AppFeature = "chat" | "viewers";

interface FeatureNavProps {
  activeFeature: AppFeature;
  onChange: (feature: AppFeature) => void;
}

const tabClass = (active: boolean) =>
  `w-full px-5 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 ${
    active
      ? "bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]"
      : "bg-dark-bg-card text-dark-text-secondary border border-dark-border hover:border-indigo-400 hover:text-dark-text-primary"
  }`;

export const FeatureNav: React.FC<FeatureNavProps> = ({
  activeFeature,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 self-stretch min-w-[160px] max-w-[405px]">
      <button
        type="button"
        onClick={() => onChange("chat")}
        className={tabClass(activeFeature === "chat")}
      >
        Chat
      </button>
      <button
        type="button"
        onClick={() => onChange("viewers")}
        className={tabClass(activeFeature === "viewers")}
      >
        Contador de views
      </button>
    </div>
  );
};
