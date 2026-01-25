import React, { useState } from 'react';
import { Settings, Droplets, ArrowUpRight, ArrowDownRight, Activity, Beaker, Ship, Check } from 'lucide-react';

const ProductionParameters = ({ params, setParams }) => {


    const [applied, setApplied] = useState(false);
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

    // Calculate API price differential (±0.4% per degree, max ±8%)
    const apiPriceDiff = ((params.oilAPI || 28) - 30) * 0.4;
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

                        {/* FPSO COMPLEXITY & COST ESTIMATION */}
                        <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 text-white rounded-lg">
                                    <Ship size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900">Custo Estimado do FPSO</h3>
                                    <p className="text-xs text-blue-600">Estimativa de CAPEX do FPSO baseada nos parâmetros do reservatório (~45% do CAPEX total)</p>
                                </div>
                            </div>

                            {(() => {
                                // FPSO COST ESTIMATION LOGIC
                                const capacity = params.peakProduction || 150; // kbpd
                                const api = params.oilAPI || 28;
                                const gorValue = params.gor || 150;

                                // 1. BASE COST: FPSO-only cost is approximately $10-15k per bpd capacity
                                // Using $12k/bpd as base (FPSO represents ~45% of total project CAPEX)
                                const baseCostPerBpd = 12000; // US$/bpd (FPSO only)
                                const baseCost = capacity * 1000 * baseCostPerBpd; // Total FPSO base cost

                                // 2. API ADJUSTMENT: Heavy oil requires more processing
                                // API > 35 (light): -10% (less processing)
                                // API 25-35 (medium): 0%
                                // API < 25 (heavy): +15% (more heating, processing)
                                let apiAdjustment = 0;
                                let apiRationale = '';
                                if (api > 35) {
                                    apiAdjustment = -0.10;
                                    apiRationale = 'Óleo leve (> 35º API) - menos módulos de processamento necessários';
                                } else if (api < 25) {
                                    apiAdjustment = 0.15;
                                    apiRationale = 'Óleo pesado (< 25º API) - requer aquecimento e mais processamento';
                                } else {
                                    apiAdjustment = 0;
                                    apiRationale = 'Óleo médio (25-35º API) - processamento padrão';
                                }

                                // 3. GOR ADJUSTMENT: High GOR requires gas handling equipment
                                // GOR < 100: 0% (low gas)
                                // GOR 100-250: +10% (moderate gas handling)
                                // GOR 250-400: +20% (significant gas facilities)
                                // GOR > 400: +30% (major gas infrastructure)
                                let gorAdjustment = 0;
                                let gorRationale = '';
                                if (gorValue < 100) {
                                    gorAdjustment = 0;
                                    gorRationale = 'Baixo GOR (< 100 m³/m³) - equipamentos mínimos de gás';
                                } else if (gorValue < 250) {
                                    gorAdjustment = 0.10;
                                    gorRationale = 'GOR moderado (100-250 m³/m³) - separação e tratamento básico';
                                } else if (gorValue < 400) {
                                    gorAdjustment = 0.20;
                                    gorRationale = 'Alto GOR (250-400 m³/m³) - instalações significativas de gás';
                                } else {
                                    gorAdjustment = 0.30;
                                    gorRationale = 'GOR muito alto (> 400 m³/m³) - infraestrutura completa de gás/reinjeção';
                                }

                                // TOTAL CALCULATION
                                const totalAdjustment = 1 + apiAdjustment + gorAdjustment;
                                const estimatedFpsoCost = baseCost * totalAdjustment;
                                const costPerBpdFinal = estimatedFpsoCost / (capacity * 1000);

                                return (
                                    <div className="space-y-4">
                                        {/* ESTIMATED COST */}
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-600">CAPEX Estimado do FPSO:</span>
                                                <span className="text-2xl font-bold text-blue-700">
                                                    ${(estimatedFpsoCost / 1000000000).toFixed(2)}B
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500 text-right">
                                                ${costPerBpdFinal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} por bpd de capacidade
                                            </div>
                                        </div>

                                        {/* RATIONALE BREAKDOWN */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold uppercase text-blue-800 tracking-wider">Racional da Estimativa</h4>

                                            {/* Base Cost */}
                                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium text-slate-700">Custo Base (Capacidade)</span>
                                                        <span className="text-sm font-bold text-slate-800">${(baseCost / 1000000000).toFixed(2)}B</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        {capacity}k bpd × $12.000/bpd = custo base FPSO (~45% do projeto total)
                                                    </p>
                                                </div>
                                            </div>

                                            {/* API Adjustment */}
                                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium text-slate-700">Ajuste por Qualidade do Óleo</span>
                                                        <span className={`text-sm font-bold ${apiAdjustment > 0 ? 'text-red-600' : apiAdjustment < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                            {apiAdjustment > 0 ? '+' : ''}{(apiAdjustment * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        API {api}º: {apiRationale}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* GOR Adjustment */}
                                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium text-slate-700">Ajuste por Razão Gás-Óleo</span>
                                                        <span className={`text-sm font-bold ${gorAdjustment > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                            {gorAdjustment > 0 ? '+' : ''}{(gorAdjustment * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        GOR {gorValue} m³/m³: {gorRationale}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>


                                        <button
                                            onClick={() => {
                                                // FPSO = 45% do total, então: Total = FPSO / 0.45
                                                const totalProjectCapex = Math.round(estimatedFpsoCost / 0.45);
                                                setParams(prev => ({
                                                    ...prev,
                                                    totalCapex: totalProjectCapex,
                                                    capexSplit: {
                                                        platform: 45, // FPSO
                                                        wells: 35,    // Poços
                                                        subsea: 20    // Subsea
                                                    }
                                                }));

                                                // Visual feedback
                                                setApplied(true);
                                                setTimeout(() => setApplied(false), 2000);
                                            }}
                                            disabled={applied}
                                            className={`w-full py-3 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${applied
                                                ? 'bg-emerald-500 text-white cursor-default scale-[1.02]'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                                                }`}
                                        >
                                            {applied ? (
                                                <>
                                                    <Check size={18} /> Aplicado com Sucesso!
                                                </>
                                            ) : (
                                                'Aplicar Estimativa ao CAPEX do Projeto'
                                            )}
                                        </button>
                                        <p className="text-[10px] text-center text-blue-600">
                                            Calcula CAPEX total (~${(estimatedFpsoCost / 0.45 / 1000000000).toFixed(2)}B) e define split: FPSO 45% | Poços 35% | Subsea 20%
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionParameters;
