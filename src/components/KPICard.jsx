import React from 'react';
import { Info } from 'lucide-react';

const KPICard = ({ title, value, subtext, type = 'neutral', tooltip }) => {
    const colors = {
        neutral: 'text-slate-700 dark:text-slate-200',
        positive: 'text-emerald-700 dark:text-emerald-400',
        negative: 'text-red-700 dark:text-red-400',
        blue: 'text-blue-700 dark:text-blue-400',
        purple: 'text-purple-700 dark:text-purple-400'
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</div>
                {tooltip && (
                    <div className="group relative">
                        <Info className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-help" />
                        <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] rounded shadow-lg hidden group-hover:block z-50 pointer-events-none group-hover:pointer-events-auto">
                            {tooltip}
                        </div>
                    </div>
                )}
            </div>
            <div className={`text-xl font-bold mt-2 ${colors[type]}`}>{value}</div>
            {subtext && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{subtext}</div>}
        </div>
    );
};

export default KPICard;
