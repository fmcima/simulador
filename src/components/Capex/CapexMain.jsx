import React, { useState } from 'react';
import { Anchor, ArrowRight, Droplets, GitMerge } from 'lucide-react';
import FpsoCapex from './FpsoCapex';
import WellsCapex from './WellsCapex';
import SubseaCapex from './SubseaCapex';

export default function CapexMain({ currentParams, onUpdate, peakProduction, wellsParams, onUpdateWells, subseaParams, onUpdateSubsea, projectParams, unitNpv }) {
    const [activeModule, setActiveModule] = useState('selection'); // 'selection', 'fpso', 'wells', 'subsea'

    const renderSelectionScreen = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">Estimativa de CAPEX</h2>
                <p className="text-slate-500 dark:text-slate-400">Selecione uma disciplina abaixo para realizar o detalhamento de custos e engenharia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* FPSO CARD */}
                <button
                    onClick={() => setActiveModule('fpso')}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Anchor size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Unidade FPSO</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">Detalhamento de Casco, Topsides e Integração.</p>

                        <div className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                            Configurar <ArrowRight size={16} className="ml-1" />
                        </div>
                    </div>
                </button>

                {/* WELLS CARD */}
                <button
                    onClick={() => setActiveModule('wells')}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Droplets size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Engenharia de Poços</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">Campanha de perfuração e completação.</p>

                        <div className="flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                            Configurar <ArrowRight size={16} className="ml-1" />
                        </div>
                    </div>
                </button>

                {/* SUBSEA CARD */}
                <button
                    onClick={() => setActiveModule('subsea')}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:border-sky-500/50 transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-sky-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <GitMerge size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Sistema Submarino</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">Risers, Flowlines e Umbilicais (SURF).</p>

                        <div className="flex items-center text-sm font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                            Configurar <ArrowRight size={16} className="ml-1" />
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header / Breadcrumb */}
            {activeModule !== 'selection' && (
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <button
                        onClick={() => setActiveModule('selection')}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        Seleção CAPEX
                    </button>
                    <span className="text-slate-400">/</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {activeModule === 'fpso' ? 'FPSO' : activeModule === 'wells' ? 'Poços' : 'Subsea'}
                    </span>
                </div>
            )}

            {/* Content */}
            {activeModule === 'selection' && renderSelectionScreen()}
            {activeModule === 'fpso' && (
                <FpsoCapex
                    key={`${currentParams?.mode}-${currentParams?.complexity}`}
                    initialParams={currentParams}
                    peakProduction={peakProduction}
                    onUpdate={onUpdate}
                />
            )}
            {activeModule === 'wells' && (
                <WellsCapex
                    initialParams={wellsParams}
                    onUpdate={onUpdateWells}
                    costs={currentParams}
                    projectParams={projectParams}
                    unitNpv={unitNpv}
                />
            )}
            {activeModule === 'subsea' && (
                <SubseaCapex
                    initialParams={subseaParams}
                    onUpdate={onUpdateSubsea}
                    wellsParams={wellsParams}
                />
            )}
        </div>
    );
}
