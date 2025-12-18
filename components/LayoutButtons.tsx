import React from 'react';
import { getColorClass } from '../utils/theme';

export const SidebarButton = ({ isActive, onClick, icon, label, subLabel, color }: any) => {
    return (
        <button
            onClick={onClick}
            className={`w-full p-4 transition-all duration-300 flex items-center gap-4 group text-left relative overflow-hidden flex-shrink-0 premium-card
        ${isActive
                    ? 'bg-white border-l-4 border-[#5D432C] translate-x-1 shadow-md'
                    : 'bg-white/40 hover:bg-white text-stone-500 border-l-2 border-transparent'
                }
      `}
        >
            <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center transition-all duration-500
        ${isActive ? `bg-[#5D432C] text-white` : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}
      `}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className={`font-black text-[10px] tracking-wider uppercase ${isActive ? 'text-[#333333]' : 'text-stone-400 group-hover:text-stone-600 font-medium'}`}>
                    {label}
                </div>
                {subLabel && (
                    <div className="text-[9px] text-stone-300 font-bold uppercase tracking-widest opacity-60 mt-0.5">{subLabel}</div>
                )}
            </div>
        </button>
    );
};

export const NavButton = ({ isActive, onClick, icon, label, color, className }: any) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center py-2 gap-1 transition-all duration-500 ${className}
        ${isActive ? `text-[#5D432C] scale-105` : 'text-stone-400 hover:text-stone-600'}
      `}
        >
            <div className={`transition-all duration-500 ${isActive ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
                {icon}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
            {isActive && <div className={`w-3 h-0.5 bg-[#5D432C] mt-0.5`}></div>}
        </button>
    );
};
