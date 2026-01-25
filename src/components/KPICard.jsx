import React from 'react';
import { Info } from 'lucide-react';

const KPICard = ({ title, value, subtext, type = 'neutral', tooltip }) => {
    const colors = {
        neutral: 'text-slate-700',
        positive: 'text-emerald-700',
        negative: 'text-red-700',
        blue: 'text-blue-700',
        purple: 'text-purple-700'
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
                {tooltip && (
                    <div className="group relative">
                        <Info className="w-4 h-4 text-slate-300 cursor-help" />
                        <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg hidden group-hover:block z-50 pointer-events-none group-hover:pointer-events-auto">
                            {tooltip}
                        </div>
                    </div>
                )}
            </div>
            <div className={`text-xl font-bold mt-2 ${colors[type]}`}>{value}</div>
            {subtext && <div className="text-[10px] text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
};

export default KPICard;
