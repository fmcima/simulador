import React from 'react';
import { TrendingDown, Droplets, Calculator } from 'lucide-react';

// Formatters
const formatBillions = (value) => {
    const inBillions = value / 1000000000;
    return `$${inBillions.toFixed(2)}B`;
};

const ProjectInputForm = ({ params, setParams, label, colorClass = "accent-blue-600" }) => {
    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">

            {/* Grupo CAPEX */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" /> Investimento (CAPEX)
                </h3>
                <div className="space-y-3">

                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block flex justify-between">
                            <span>Investimento Total (USD)</span>
                            <span className="text-[10px] text-slate-400">
                                {params.platformOwnership === 'chartered' ? '(Poços + Subsea)' : '(Plataforma + Poços + Subsea)'}
                            </span>
                        </label>
                        <input
                            type="range" min="0" max="10000000000" step="100000000"
                            value={params.totalCapex}
                            onChange={(e) => handleChange('totalCapex', Number(e.target.value))}
                            className={`w-full ${colorClass}`}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-slate-400 font-mono">
                                {formatBillions(params.totalCapex)}
                            </span>
                            <div className="flex items-center gap-1 bg-slate-50 rounded px-2 py-1 border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-medium">Manual (Bi $):</span>
                                <input
                                    type="number" step="0.1"
                                    value={params.totalCapex / 1000000000}
                                    onChange={(e) => handleChange('totalCapex', Number(e.target.value) * 1000000000)}
                                    className="w-16 text-right text-xs font-mono font-bold text-slate-700 outline-none bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duração e Perfil */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1 flex justify-between">
                                <span>Duração (Anos)</span>
                                <span className="font-bold">{params.capexDuration}</span>
                            </label>
                            <input type="range" min="1" max="8" step="1" value={params.capexDuration} onChange={(e) => handleChange('capexDuration', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1 flex justify-between">
                                <span>Ano do Pico de Investimento</span>
                                <span className="font-bold">Ano {params.capexPeakRelative || 1}</span>
                            </label>
                            <input type="range" min="1" max={params.capexDuration} step="1" value={params.capexPeakRelative || 1} onChange={(e) => handleChange('capexPeakRelative', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1 flex justify-between">
                                <span>Concentração do Investimento</span>
                                <span className="font-bold">{params.capexConcentration}%</span>
                            </label>
                            <input type="range" min="0" max="100" step="10" value={params.capexConcentration} onChange={(e) => handleChange('capexConcentration', Number(e.target.value))} className={`w-full ${colorClass}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grupo Operação & Preço */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-500" /> Produção & Preço
                </h3>
                <div className="space-y-3">

                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Estratégia de Preço</label>
                        <select
                            value={params.brentStrategy}
                            onChange={(e) => handleChange('brentStrategy', e.target.value)}
                            className="w-full text-xs p-1.5 rounded border border-slate-300 outline-none focus:border-blue-500"
                        >
                            <option value="constant">Constante</option>
                            <option value="market_bull">Otimista</option>
                            <option value="market_bear">Transição Energética</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between">
                            <span>Preço Brent Inicial</span>
                            <span className="text-[10px] bg-slate-100 px-1 rounded">${params.brentPrice}</span>
                        </label>
                        <input type="range" min="30" max="120" step="1" value={params.brentPrice} onChange={(e) => handleChange('brentPrice', Number(e.target.value))} className={`w-full ${colorClass}`} />
                    </div>

                    {params.brentStrategy === 'custom' && (
                        <div className="bg-slate-50 p-3 rounded space-y-3 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-bold uppercase text-slate-400">Configuração da Curva</h4>

                            <div>
                                <label className="text-xs font-medium text-slate-500 flex justify-between">
                                    <span>Ano de Pico</span>
                                    <span className="font-bold">Ano {params.brentPeakYear || 5}</span>
                                </label>
                                <input type="range" min="1" max="20" step="1"
                                    value={params.brentPeakYear || 5}
                                    onChange={(e) => handleChange('brentPeakYear', Number(e.target.value))}
                                    className={`w-full ${colorClass}`} />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 flex justify-between">
                                    <span>Valor no Pico ($)</span>
                                    <span className="font-bold">${params.brentPeakValue || 90}</span>
                                </label>
                                <input type="range" min="30" max="200" step="1"
                                    value={params.brentPeakValue || 90}
                                    onChange={(e) => handleChange('brentPeakValue', Number(e.target.value))}
                                    className={`w-full ${colorClass}`} />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 flex justify-between">
                                    <span>Longo Prazo ($)</span>
                                    <span className="font-bold">${params.brentLongTerm || 60}</span>
                                </label>
                                <input type="range" min="30" max="150" step="1"
                                    value={params.brentLongTerm || 60}
                                    onChange={(e) => handleChange('brentLongTerm', Number(e.target.value))}
                                    className={`w-full ${colorClass}`} />
                            </div>
                        </div>
                    )}



                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between">
                            <span>Produção Pico (mil bpd)</span>
                            <span className="text-[10px] bg-slate-100 px-1 rounded">{params.peakProduction}k</span>
                        </label>
                        <input type="range" min="1" max="300" step="1" value={params.peakProduction} onChange={(e) => handleChange('peakProduction', Number(e.target.value))} className={`w-full ${colorClass}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                            <label className="text-xs font-medium text-slate-500">Ramp-up (Anos)</label>
                            <input type="number" value={params.rampUpDuration} onChange={(e) => handleChange('rampUpDuration', Number(e.target.value))} className="w-full border rounded p-1 text-xs" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500">Declínio (%)</label>
                            <input type="number" value={params.declineRate} onChange={(e) => handleChange('declineRate', Number(e.target.value))} className="w-full border rounded p-1 text-xs" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500">Margem OPEX: {params.opexMargin}%</label>
                        <input
                            type="range" min="10" max="90" step="5"
                            value={params.opexMargin}
                            onChange={(e) => handleChange('opexMargin', Number(e.target.value))}
                            className={`w-full ${colorClass}`}
                        />
                    </div>
                </div>
            </div>

            {/* Grupo Financeiro */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-500" /> Premissas
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-500">TMA (%): {params.discountRate}</label>
                        <input type="range" min="0" max="25" step="0.5" value={params.discountRate} onChange={(e) => handleChange('discountRate', Number(e.target.value))} className={`w-full ${colorClass}`} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500">Duração (Anos): {params.projectDuration}</label>
                        <input type="range" min="10" max="40" step="1" value={params.projectDuration} onChange={(e) => handleChange('projectDuration', Number(e.target.value))} className={`w-full ${colorClass}`} />
                    </div>

                    {/* INFLAÇÃO DE CUSTOS */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between">
                            <span>Inflação de Custos (Real %)</span>
                            <span className="text-[10px] bg-slate-100 px-1 rounded">{params.costInflation}%</span>
                        </label>
                        <input
                            type="range" min="0" max="10" step="0.5"
                            value={params.costInflation}
                            onChange={(e) => handleChange('costInflation', Number(e.target.value))}
                            className={`w-full ${colorClass}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInputForm;
