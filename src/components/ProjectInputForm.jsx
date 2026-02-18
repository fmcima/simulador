import React from 'react';
import { TrendingDown, Droplets, Calculator, Wrench, Info, ChevronUp, ChevronDown } from 'lucide-react';

// Formatters
const formatBillions = (value) => {
    const inBillions = value / 1000000000;
    return `$${inBillions.toFixed(2)}B`;
};

const ProjectInputForm = ({ params, setParams, label, colorClass = "accent-blue-600", onNavigateToCapex, onNavigateToOpex }) => {
    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">

            {/* Grupo Operação & Preço */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:border-slate-600 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-500" /> Produção & Preço
                </h3>
                <div className="space-y-3">

                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                            <span>Produção Pico (mil bpd)</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{params.peakProduction}k</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('peakProduction', Math.max(1, Number(params.peakProduction) - 5))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input type="range" min="1" max="300" step="5" value={params.peakProduction} onChange={(e) => handleChange('peakProduction', Number(e.target.value))} className={`flex-1 ${colorClass}`} />
                            <button onClick={() => handleChange('peakProduction', Math.min(300, Number(params.peakProduction) + 5))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ramp-up (Anos)</label>
                            <input type="number" value={params.rampUpDuration} onChange={(e) => handleChange('rampUpDuration', Number(e.target.value))} className="w-full border border-slate-300 dark:border-slate-600 rounded p-1 text-xs bg-white dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Declínio (%)</label>
                            <input type="number" value={params.declineRate} onChange={(e) => handleChange('declineRate', Number(e.target.value))} className="w-full border border-slate-300 dark:border-slate-600 rounded p-1 text-xs bg-white dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Estratégia de Preço</label>
                        <select
                            value={params.brentStrategy}
                            onChange={(e) => handleChange('brentStrategy', e.target.value)}
                            className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 outline-none focus:border-blue-500 bg-white dark:bg-slate-800 dark:text-slate-200"
                        >
                            <option value="constant">Constante</option>
                            <option value="market_bull">Otimista</option>
                            <option value="market_bear">Transição Energética</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                            <span>Preço Brent Inicial</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">${params.brentPrice}</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('brentPrice', Math.max(30, Number(params.brentPrice) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input type="range" min="30" max="120" step="1" value={params.brentPrice} onChange={(e) => handleChange('brentPrice', Number(e.target.value))} className={`flex-1 ${colorClass}`} />
                            <button onClick={() => handleChange('brentPrice', Math.min(120, Number(params.brentPrice) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>

                    {params.brentStrategy === 'custom' && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded space-y-3 border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Configuração da Curva</h4>

                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Ano de Pico</span>
                                    <span className="font-bold">Ano {params.brentPeakYear || 5}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleChange('brentPeakYear', Math.max(1, (params.brentPeakYear || 5) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={14} /></button>
                                    <input type="range" min="1" max="20" step="1"
                                        value={params.brentPeakYear || 5}
                                        onChange={(e) => handleChange('brentPeakYear', Number(e.target.value))}
                                        className={`flex-1 ${colorClass}`} />
                                    <button onClick={() => handleChange('brentPeakYear', Math.min(20, (params.brentPeakYear || 5) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={14} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Valor no Pico ($)</span>
                                    <span className="font-bold">${params.brentPeakValue || 90}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleChange('brentPeakValue', Math.max(30, (params.brentPeakValue || 90) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={14} /></button>
                                    <input type="range" min="30" max="200" step="1"
                                        value={params.brentPeakValue || 90}
                                        onChange={(e) => handleChange('brentPeakValue', Number(e.target.value))}
                                        className={`flex-1 ${colorClass}`} />
                                    <button onClick={() => handleChange('brentPeakValue', Math.min(200, (params.brentPeakValue || 90) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={14} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Longo Prazo ($)</span>
                                    <span className="font-bold">${params.brentLongTerm || 60}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleChange('brentLongTerm', Math.max(30, (params.brentLongTerm || 60) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={14} /></button>
                                    <input type="range" min="30" max="150" step="1"
                                        value={params.brentLongTerm || 60}
                                        onChange={(e) => handleChange('brentLongTerm', Number(e.target.value))}
                                        className={`flex-1 ${colorClass}`} />
                                    <button onClick={() => handleChange('brentLongTerm', Math.min(150, (params.brentLongTerm || 60) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={14} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-orange-500" /> Custos Operacionais
                        </h4>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                Margem OPEX: {params.opexMargin}%
                                <div className="group relative">
                                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg hidden group-hover:block z-50 pointer-events-none text-center">
                                        Percentual da Receita Bruta (modo simplificado)
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                    </div>
                                </div>
                            </label>
                            {onNavigateToOpex && (
                                <button
                                    onClick={onNavigateToOpex}
                                    className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-medium border border-blue-200 dark:border-blue-800"
                                >
                                    Detalhamento
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('opexMargin', Math.max(10, Number(params.opexMargin) - 5))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input
                                type="range" min="10" max="90" step="5"
                                value={params.opexMargin}
                                onChange={(e) => handleChange('opexMargin', Number(e.target.value))}
                                className={`flex-1 ${colorClass}`}
                            />
                            <button onClick={() => handleChange('opexMargin', Math.min(90, Number(params.opexMargin) + 5))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grupo CAPEX */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:border-slate-600 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" /> Investimento (CAPEX)
                </h3>
                <div className="space-y-3">



                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block flex justify-between">
                        <span>Investimento Total (CAPEX)</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {params.platformOwnership === 'chartered' ? '(Poços + Subsea)' : '(Plataforma + Poços + Subsea)'}
                        </span>
                    </label>
                    <input
                        type="range" min="0" max="10000000000" step="100000000"
                        value={params.totalCapex}
                        onChange={(e) => handleChange('totalCapex', Number(e.target.value))}
                        className={`w-full ${colorClass}`}
                    />
                    <div className={`flex ${onNavigateToCapex ? 'justify-between' : 'justify-end'} items-center mt-1`}>
                        {onNavigateToCapex && (
                            <button
                                onClick={onNavigateToCapex}
                                className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-medium border border-blue-200 dark:border-blue-800"
                            >
                                Detalhamento
                            </button>
                        )}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Manual (Bi $):</span>
                            <input
                                type="number" step="0.1"
                                value={(params.totalCapex / 1000000000).toFixed(1)}
                                onChange={(e) => handleChange('totalCapex', Number(e.target.value) * 1000000000)}
                                className="w-16 text-right text-xs font-mono font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Duração e Perfil */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex justify-between">
                                <span>Duração do Investimento (Anos)</span>
                                <span className="font-bold">{params.capexDuration}</span>
                            </label>
                            <input type="range" min="1" max="8" step="1" value={params.capexDuration} onChange={(e) => handleChange('capexDuration', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex justify-between">
                                <span>Ano do Pico de Investimento</span>
                                <span className="font-bold">Ano {params.capexPeakRelative || 1}</span>
                            </label>
                            <input type="range" min="1" max={params.capexDuration} step="1" value={params.capexPeakRelative || 1} onChange={(e) => handleChange('capexPeakRelative', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex justify-between">
                                <span>Concentração do Investimento</span>
                                <span className="font-bold">{params.capexConcentration}%</span>
                            </label>
                            <input type="range" min="0" max="100" step="10" value={params.capexConcentration} onChange={(e) => handleChange('capexConcentration', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grupo Financeiro */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:border-slate-600 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-500" /> Premissas
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">TMA (%): {params.discountRate}</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('discountRate', Math.max(0, Number(params.discountRate) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input type="range" min="0" max="25" step="1" value={params.discountRate} onChange={(e) => handleChange('discountRate', Number(e.target.value))} className={`flex-1 ${colorClass}`} />
                            <button onClick={() => handleChange('discountRate', Math.min(25, Number(params.discountRate) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Duração do Projeto (Anos): {params.projectDuration}</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('projectDuration', Math.max(10, Number(params.projectDuration) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input type="range" min="10" max="40" step="1" value={params.projectDuration} onChange={(e) => handleChange('projectDuration', Number(e.target.value))} className={`flex-1 ${colorClass}`} />
                            <button onClick={() => handleChange('projectDuration', Math.min(40, Number(params.projectDuration) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>

                    {/* INFLAÇÃO DE CUSTOS */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                            <span>Inflação de Custos (Real %)</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{params.costInflation}%</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleChange('costInflation', Math.max(0, Number(params.costInflation) - 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronDown size={16} /></button>
                            <input
                                type="range" min="0" max="10" step="1"
                                value={params.costInflation}
                                onChange={(e) => handleChange('costInflation', Number(e.target.value))}
                                className={`flex-1 ${colorClass}`}
                            />
                            <button onClick={() => handleChange('costInflation', Math.min(10, Number(params.costInflation) + 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronUp size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ProjectInputForm;
