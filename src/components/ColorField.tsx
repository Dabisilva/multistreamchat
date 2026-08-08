import React from "react";
import CustomRangeInput from "./CustomRangeInput";

interface ColorFieldProps {
  label: string;
  color: string;
  onColorChange: (value: string) => void;
  alpha?: string;
  onAlphaChange?: (value: string) => void;
}

export const ColorField: React.FC<ColorFieldProps> = ({
  label,
  color,
  onColorChange,
  alpha,
  onAlphaChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-dark-text-secondary mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 w-10 rounded border-2 border-dark-border cursor-pointer bg-dark-bg-secondary"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
        />
      </div>
      {alpha !== undefined && onAlphaChange && (
        <CustomRangeInput
          min={0}
          max={1}
          step={0.01}
          value={1 - parseFloat(alpha)}
          onChange={(value) => onAlphaChange((1 - value).toString())}
          label={`Transparência: ${Math.round((1 - parseFloat(alpha)) * 100)}%`}
        />
      )}
    </div>
  );
};
