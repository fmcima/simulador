import React from 'react';
import { Settings, Droplets, ArrowUpRight, ArrowDownRight, Activity, Beaker } from 'lucide-react';

const ProductionParameters = ({ params, setParams }) => {

    const mode = params.productionMode || 'simple';

    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    const setMode = (newMode) => {
        handleChange('productionMode', newMode);
    };

    // Presets for Simple Mode (Field Profiles)
    const applySimplePreset = (type) => {
        if (type === 'pre_salt') {
            setParams(prev => ({
                ...prev,
                peakProduction: 180,
                rampUpDuration: 3,
                plateauDuration: 4,
                declineRate: 8,
                oilAPI: 28,
                gor: 200,
                maxLiquids: 200000
            }));
        } else if (type === 'post_salt') {
            setParams(prev => ({
                ...prev,
                peakProduction: 100,
                rampUpDuration: 2,
                plateauDuration: 3,
                declineRate: 12,
                oilAPI: 22,
                gor: 80,
                maxLiquids: 150000
            }));
        } else if (type === 'onshore') {
            setParams(prev => ({
                ...prev,
                peakProduction: 15,
                rampUpDuration: 1,
                plateauDuration: 6,
                declineRate: 6,
                oilAPI: 35,
                gor: 50,
                maxLiquids: 30000
            }));
        }
    };

    // Presets for Detailed Mode (Reservoir Quality)
    const applyDetailedPreset = (quality) => {
        if (quality === 'low') {
            setParams(prev => ({
                ...prev,
                oilAPI: 16,
                gor: 50,
                maxLiquids: 100000
            }));
        } else if (quality === 'medium') {
            setParams(prev => ({
                ...prev,
                oilAPI: 28,
                gor: 150,
                maxLiquids: 200000
            }));
        } else if (quality === 'high') {
            setParams(prev => ({
                ...prev,
                oilAPI: 40,
                gor: 350,
                maxLiquids: 350000
            }));
        }
    };

    // Calculate API price differential
    const apiPriceDiff = ((params.oilAPI || 28) - 30) * 1.5;
    const apiLabel = params.oilAPI > 30 ? 'Premium (Leve)' : params.oilAPI < 25 ? 'Desconto (Pesado)' : 'Referência (Médio)';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Parâmetros de Produção</h2>
                        <p className="text-sm text-slate-500">Configure o perfil de produção e características do reservatório.</p>
                    </div>
                </div>

                {/* MODE SWITCH */}
                <div className="bg-slate-100 p-1 rounded-lg flex mb-6">
                    <button
                        onClick={() => setMode('simple')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'simple' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Simplificado (Curva Típica)
                    </button>
                    <button
                        onClick={() => setMode('detailed')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'detailed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Detalhado (Reservatório & Fluidos)
                    </button>
                </div>

                {/* SIMPLE MODE PRESETS */}
                {mode === 'simple' && (
                    <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <label className="block text-sm font-bold text-emerald-700 mb-3">Escolha um Perfil Típico:</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <button onClick={() => applySimplePreset('pre_salt')} className="p-3 text-left bg-white rounded-lg border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">Pré-Sal (Offshore)</div>
                                <div className="text-xs text-slate-500">Alta prod., platô 4 anos, dec. 8%</div>
                            </button>
                            <button onClick={() => applySimplePreset('post_salt')} className="p-3 text-left bg-white rounded-lg border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">Pós-Sal (Offshore)</div>
                                <div className="text-xs text-slate-500">Campos maduros, dec. 12%</div>
                            </button>
                            <button onClick={() => applySimplePreset('onshore')} className="p-3 text-left bg-white rounded-lg border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">Onshore</div>
                                <div className="text-xs text-slate-500">Vida longa, dec. 6%</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* COMMON PARAMS: PRODUCTION CURVE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between mb-2">
                            <span>Produção Pico (mil bpd)</span>
                            <span className="font-bold text-emerald-700">{params.peakProduction}k</span>
                        </label>
                        <input
                            type="range" min="10" max="300" step="5"
                            value={params.peakProduction}
                            onChange={(e) => handleChange('peakProduction', Number(e.target.value))}
                            className="w-full accent-emerald-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between mb-2">
                            <span>Duração do Platô (anos)</span>
                            <span className="font-bold text-emerald-700">{params.plateauDuration}</span>
                        </label>
                        <input
                            type="range" min="0" max="10" step="1"
                            value={params.plateauDuration}
                            onChange={(e) => handleChange('plateauDuration', Number(e.target.value))}
                            className="w-full accent-emerald-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 flex justify-between mb-2">
                            <span>Taxa de Declínio Anual (%)</span>
                            <span className="font-bold text-emerald-700">{params.declineRate}%</span>
                        </label>
                        <input
                            type="range" min="1" max="25" step="1"
                            value={params.declineRate}
                            onChange={(e) => handleChange('declineRate', Number(e.target.value))}
                            className="w-full accent-emerald-600"
                        />
                    </div>
                </div>

                {/* DETAILED MODE: RESERVOIR & FLUID PARAMS */}
                {mode === 'detailed' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* QUALITY PRESETS */}
                        <div className="flex gap-2 mb-4 items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qualidade do Reservatório:</span>
                            <button onClick={() => applyDetailedPreset('low')} className="text-xs bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full text-red-700 font-medium transition-colors">Baixa</button>
                            <button onClick={() => applyDetailedPreset('medium')} className="text-xs bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-full text-amber-700 font-medium transition-colors">Média</button>
                            <button onClick={() => applyDetailedPreset('high')} className="text-xs bg-green-100 hover:bg-green-200 px-3 py-1 rounded-full text-green-700 font-medium transition-colors">Alta</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* API GRAVITY */}
                            <div className="p-4 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                                    <Droplets size={18} className="text-emerald-500" /> Grau API do Óleo
                                </label>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-3xl font-bold text-slate-800">{params.oilAPI || 28}º</span>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${params.oilAPI > 30 ? 'bg-green-100 text-green-700' : params.oilAPI < 25 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {apiLabel}
                                            </span>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Ajuste de Preço: {apiPriceDiff > 0 ? '+' : ''}{apiPriceDiff.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="range" min="10" max="50" step="1"
                                        value={params.oilAPI || 28}
                                        onChange={(e) => handleChange('oilAPI', Number(e.target.value))}
                                        className="w-full accent-emerald-600"
                                    />
                                    <p className="text-xs text-slate-500">
                                        Define a qualidade do óleo. Óleos mais leves (maior API) têm valor de mercado superior ao Brent.
                                    </p>
                                </div>
                            </div>

                            {/* GOR & MAX LIQUIDS */}
                            <div className="space-y-6">
                                <div className="p-4 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                        <Beaker size={18} className="text-slate-400" /> Razão Gás-Óleo (RGO)
                                    </label>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-500">Baixo Gás</span>
                                        <span className="font-mono bg-slate-50 px-2 py-1 rounded text-sm font-bold">{params.gor || 150} m³/m³</span>
                                        <span className="text-xs text-slate-500">Alto Gás</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="500" step="10"
                                        value={params.gor || 150}
                                        onChange={(e) => handleChange('gor', Number(e.target.value))}
                                        className="w-full accent-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        Volume de gás produzido por m³ de óleo. Valores altos indicam condensado ou cap de gás.
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                        <Activity size={18} className="text-slate-400" /> Capacidade de Líquidos (BSW Máx)
                                    </label>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-500">Pequena</span>
                                        <span className="font-mono bg-slate-50 px-2 py-1 rounded text-sm font-bold">{((params.maxLiquids || 200000) / 1000).toFixed(0)}k bpd</span>
                                        <span className="text-xs text-slate-500">Grande</span>
                                    </div>
                                    <input
                                        type="range" min="50000" max="500000" step="10000"
                                        value={params.maxLiquids || 200000}
                                        onChange={(e) => handleChange('maxLiquids', Number(e.target.value))}
                                        className="w-full accent-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        Limite de processamento de fluidos (Óleo + Água). Determina o gargalo de produção em fases maduras.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionParameters;
