import React from 'react';

interface ActionButtonProps {
  title: string;
  cost: string;
  effect: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}

export default function ActionButton({ title, cost, effect, icon, onClick, disabled }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
        disabled 
          ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed' 
          : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-white hover:border-indigo-500'
      }`}
    >
      <div className={`p-2 rounded-lg ${disabled ? 'bg-gray-700' : 'bg-gray-900'}`}>
        {icon}
      </div>
      <div className="text-left flex-1">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-[10px] text-gray-400">{effect}</div>
        <div className={`text-[10px] font-mono mt-1 ${disabled ? 'text-red-800' : 'text-red-400'}`}>
          Maliyet: {cost}
        </div>
      </div>
    </button>
  );
}
