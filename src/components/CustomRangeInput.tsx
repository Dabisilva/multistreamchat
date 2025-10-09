import React from 'react';

interface CustomRangeInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

const CustomRangeInput: React.FC<CustomRangeInputProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  className = ''
}) => {
  return (
    <div className={`w-full my-2 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-dark-text-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative w-full h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-full m-0 p-0 bg-transparent outline-none cursor-pointer appearance-none z-10
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6955c4] 
                     [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)] 
                     [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
                     [&::-webkit-slider-thumb:hover]:scale-110 [&::-webkit-slider-thumb:hover]:shadow-[0_3px_12px_rgba(0,0,0,0.4)]
                     [&::-webkit-slider-thumb:active]:scale-105
                     [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:bg-[#6955c4] [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#6955c4]
                     [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
                     [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:appearance-none
                     [&::-moz-range-thumb:hover]:scale-110 [&::-moz-range-thumb:hover]:shadow-[0_3px_12px_rgba(0,0,0,0.4)]
                     [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-none 
                     [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-sm"
        />
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-sm z-0 bg-[linear-gradient(to_right,#c7a3ff_50%,#a8b5ff_75%,#7dd3fc_100%)]" />
      </div>
    </div>
  );
};

export default CustomRangeInput;
