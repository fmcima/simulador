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
                gor: 50
            }));
        } else if (quality === 'medium') {
            setParams(prev => ({
                ...prev,
                oilAPI: 28,
                gor: 150
            }));
        } else if (quality === 'high') {
            setParams(prev => ({
                ...prev,
                oilAPI: 40,
                gor: 350
            }));
        }
    };

    // Calculate API price differential (±0.4% per degree, max ±8%)
    const apiPriceDiff = ((params.oilAPI || 28) - 30) * 0.4;
    const apiLabel = params.oilAPI > 30 ? 'Premium (Leve)' : params.oilAPI < 25 ? 'Desconto (Pesado)' : 'Referência (Médio)';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-lg">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Parâmetros de Produção</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configure o perfil de produção e características do reservatório.</p>
                    </div>
                </div>

                {/* MODE SWITCH */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex mb-6">
                    <button
                        onClick={() => setMode('simple')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'simple' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                    >
                        Simplificado
                    </button>
                    <button
                        onClick={() => setMode('detailed')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'detailed' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                    >
                        Detalhado
                    </button>
                </div>

                {/* SIMPLE MODE PRESETS */}
                {mode === 'simple' && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900">
                        <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3">Escolha um Perfil Típico:</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <button onClick={() => applySimplePreset('pre_salt')} className="p-3 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Pré-Sal (Offshore)</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Alta prod., platô 4 anos, dec. 8%</div>
                            </button>
                            <button onClick={() => applySimplePreset('post_salt')} className="p-3 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Pós-Sal (Offshore)</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Campos maduros, dec. 12%</div>
                            </button>
                            <button onClick={() => applySimplePreset('onshore')} className="p-3 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm transition-all group">
                                <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Onshore</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Vida longa, dec. 6%</div>
                            </button>
                        </div>

                        <div className="mt-4 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                            <p><span className="font-bold text-emerald-700 dark:text-emerald-500">Nota Metodológica:</span></p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>
                                    <strong className="text-slate-700 dark:text-slate-300">Pré-Sal:</strong> Baseado em projetos da Bacia de Santos (ex: Tupi, Búzios). Caracteriza-se por alta produtividade por poço, ramp-up rápido e platô sustentado por reinjeção de gás/água.
                                </li>
                                <li>
                                    <strong className="text-slate-700 dark:text-slate-300">Pós-Sal:</strong> Baseado em campos maduros ou convencionais da Bacia de Campos. Menor vazão inicial e declínio mais acentuado (depleção natural ou waterflood menos eficiente).
                                </li>
                                <li>
                                    <strong className="text-slate-700 dark:text-slate-300">Onshore:</strong> Baseado em bacias maduras (Recôncavo, Potiguar). Projetos de vida longa, baixo custo de abandono e curvas de produção estáveis (declínio exponencial suave).
                                </li>
                            </ul>
                            <p className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 italic">
                                Fontes de Referência: Dados públicos da ANP (Boletins de Produção), Relatórios de Reservas (DeGolyer and MacNaughton) e literatura técnica de Engenharia de Petróleo (bacias sedimentares brasileiras).
                            </p>
                        </div>
                    </div>
                )}

                {/* COMMON PARAMS: PRODUCTION CURVE */}
                {/* KPI CARD: TOTAL RECOVERABLE VOLUME */}
                <div className="mb-6">
                    {(() => {
                        const calculateRecoverableVolume = () => {
                            const peak = params.peakProduction || 100;
                            const rampUp = params.rampUpDuration || 2;
                            const plateau = params.plateauDuration || 4;
                            const decline = (params.declineRate || 10) / 100; // Di
                            const b = params.hyperbolicFactor !== undefined ? params.hyperbolicFactor : 0.5; // b factor
                            const duration = 30; // Standard duration for volume estimation

                            // Liquid Constraint Params
                            const maxLiquids = params.maxLiquids || 200000;
                            const useDetailedMode = mode === 'detailed';

                            let totalVolume = 0;
                            for (let t = 1; t <= duration; t++) {
                                let productionVolume = 0;

                                if (t <= rampUp) {
                                    productionVolume = peak * (t / rampUp);
                                } else if (t <= rampUp + plateau) {
                                    productionVolume = peak;
                                } else {
                                    const t_decline = t - (rampUp + plateau);

                                    // Arps Hyperbolic Decline
                                    // q(t) = qi / (1 + b * Di * t)^(1/b)
                                    if (b === 0) {
                                        // Exponential limit: q(t) = qi * e^(-Di * t)
                                        productionVolume = peak * Math.exp(-decline * t_decline);
                                    } else {
                                        const denominator = Math.pow(1 + b * decline * t_decline, 1 / b);
                                        productionVolume = peak / denominator;
                                    }
                                }

                                // 2. Apply Liquid Constraint (if detailed mode)
                                if (useDetailedMode) {
                                    const BSW_max = (params.bswMax || 95) / 100;
                                    const t_bt = params.bswBreakthrough || 5;
                                    const k = params.bswGrowthRate || 1.2;

                                    // Logistic Function: BSW(t) = BSW_max / (1 + e^(-k * (t - t_inflectionShift)))
                                    // Mirroring logic: Breakthrough defined as 15% BSW.
                                    const ratio = (BSW_max / 0.15) - 1;
                                    const offset = ratio > 0 ? Math.log(ratio) / k : 0;
                                    const t_inflection = t_bt + offset;
                                    const waterCut = BSW_max / (1 + Math.exp(-k * (t - t_inflection)));

                                    // Max Oil = Max Liquids * (1 - Water Cut)
                                    const maxOilFromLiquids = (maxLiquids / 1000) * (1 - waterCut); // kbpd

                                    productionVolume = Math.min(productionVolume, maxOilFromLiquids);
                                }

                                totalVolume += productionVolume * 0.365; // k bpd * 365 = MMbbl
                            }
                            return totalVolume;
                        };

                        const recoverableVolume = calculateRecoverableVolume();

                        return (
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <p className="text-emerald-50 font-medium text-xs uppercase tracking-wider mb-1">Volume Total Recuperável (30 anos)</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-3xl font-bold">{recoverableVolume.toFixed(0)}</h3>
                                            <span className="text-lg text-emerald-100 font-medium">MMbbl</span>
                                        </div>
                                        <p className="text-xs text-emerald-100/80 mt-1">Estimativa baseada na curva de Arps (b={(params.hyperbolicFactor !== undefined ? params.hyperbolicFactor : 0.5).toFixed(1)}).</p>
                                    </div>
                                    <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                        <Droplets size={28} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-600 dark:text-emerald-400" />
                        Parametrização da Curva de Produção
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                <span>Produção Pico</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{params.peakProduction}k bpd</span>
                            </label>
                            <input
                                type="range" min="10" max="300" step="5"
                                value={params.peakProduction}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setParams(prev => ({
                                        ...prev,
                                        peakProduction: val,
                                        maxLiquids: val * 1.4 * 1000 // A BSW Máx (Capacidade Líquidos) ajustada automaticamente = 1.4x Pico
                                    }));
                                }}
                                className="w-full accent-emerald-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                <span>Duração do Platô</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{params.plateauDuration} anos</span>
                            </label>
                            <input
                                type="range" min="0" max="10" step="1"
                                value={params.plateauDuration}
                                onChange={(e) => handleChange('plateauDuration', Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                <span>Taxa de Declínio Nominal</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{Number(params.declineRate).toFixed(1)}% a.a.</span>
                            </label>
                            <input
                                type="range" min="1" max="25" step="0.5"
                                value={params.declineRate}
                                onChange={(e) => handleChange('declineRate', Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Velocidade de queda da produção após o platô. Maior % = queda mais rápida.</p>
                        </div>
                        {mode === 'detailed' && (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                        <span>Fator Hiperbólico</span>
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{(params.hyperbolicFactor !== undefined ? params.hyperbolicFactor : 0.5).toFixed(1)}</span>
                                    </label>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={params.hyperbolicFactor !== undefined ? params.hyperbolicFactor : 0.5}
                                        onChange={(e) => handleChange('hyperbolicFactor', Number(e.target.value))}
                                        className="w-full accent-emerald-600"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Curvatura do declínio (b). b=0 (Exponencial), b=1 (Harmônico). Maior b = cauda mais longa.</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Presets de Tipo de Completação */}
                    {mode === 'detailed' && (
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Tipo de Completação (Impacto na Curva):</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParams(prev => ({
                                            ...prev,
                                            declineRate: 10,
                                            hyperbolicFactor: 0.2,
                                            bswBreakthrough: 5,
                                            bswGrowthRate: 1.2
                                        }));
                                    }}
                                    className={`p-3 text-left rounded-lg border transition-all group relative ${params.declineRate === 10 && Math.abs((params.hyperbolicFactor || 0.5) - 0.2) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm'}`}
                                >
                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Convencional</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Declínio: <span className="font-mono text-emerald-600">10%</span> | b: <span className="font-mono text-emerald-600">0.2</span>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        Completação padrão sem controle de fluxo zonal. Resulta em irrupção precoce de água e declínio acelerado.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParams(prev => ({
                                            ...prev,
                                            declineRate: 8,
                                            hyperbolicFactor: 0.5,
                                            bswBreakthrough: 7,
                                            bswGrowthRate: 0.7
                                        }));
                                    }}
                                    className={`p-3 text-left rounded-lg border transition-all group relative ${params.declineRate === 8 && Math.abs((params.hyperbolicFactor || 0.5) - 0.5) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm'}`}
                                >
                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Inteligente Hidráulica</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Declínio: <span className="font-mono text-emerald-600">8%</span> | b: <span className="font-mono text-emerald-600">0.5</span>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        Válvulas hidráulicas (ICV) permitem fechar zonas com água, estendendo o platô e suavizando o declínio.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParams(prev => ({
                                            ...prev,
                                            declineRate: 7,
                                            hyperbolicFactor: 0.8,
                                            bswBreakthrough: 9,
                                            bswGrowthRate: 0.4
                                        }));
                                    }}
                                    className={`p-3 text-left rounded-lg border transition-all group relative ${params.declineRate === 7 && Math.abs((params.hyperbolicFactor || 0.5) - 0.8) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm'}`}
                                >
                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:text-emerald-400">Inteligente Elétrica</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Declínio: <span className="font-mono text-emerald-600">7%</span> | b: <span className="font-mono text-emerald-600">0.8</span>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        Controle elétrico em tempo real. Máxima eficiência na gestão do reservatório, minimizando água e declínio.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'detailed' && (
                    <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Beaker size={16} className="text-blue-600 dark:text-blue-400" />
                            Modelo Matemático de BSW (Função Logística)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                    <span>Tempo de Breakthrough (t_bt)</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">Ano {params.bswBreakthrough || 5}</span>
                                </label>
                                <input
                                    type="range" min="2" max="15" step="0.5"
                                    value={params.bswBreakthrough || 5}
                                    onChange={(e) => handleChange('bswBreakthrough', Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Ano em que a produção de água acelera (Ponto de Inflexão).</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between mb-2">
                                    <span>Velocidade de Crescimento (k)</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">{(params.bswGrowthRate || 1.2).toFixed(2)}</span>
                                </label>
                                <input
                                    type="range" min="0.1" max="2.0" step="0.1"
                                    value={params.bswGrowthRate || 1.2}
                                    onChange={(e) => handleChange('bswGrowthRate', Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Quão rápido o poço "afoga". Valores maiores = subida vertical.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAILED MODE: RESERVOIR & FLUID PARAMS */}
                {mode === 'detailed' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* QUALITY PRESETS */}
                        <div className="flex gap-2 mb-4 items-center">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Qualidade do Reservatório:</span>
                            <button onClick={() => applyDetailedPreset('low')} className="text-xs bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full text-red-700 font-medium transition-colors">Baixa</button>
                            <button onClick={() => applyDetailedPreset('medium')} className="text-xs bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-full text-amber-700 font-medium transition-colors">Média</button>
                            <button onClick={() => applyDetailedPreset('high')} className="text-xs bg-green-100 hover:bg-green-200 px-3 py-1 rounded-full text-green-700 font-medium transition-colors">Alta</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* API GRAVITY */}
                            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-300 transition-colors">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
                                    <Droplets size={18} className="text-emerald-500" /> Grau API do Óleo
                                </label>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{params.oilAPI || 28}º</span>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${params.oilAPI > 30 ? 'bg-green-100 text-green-700' : params.oilAPI < 25 ? 'bg-red-100 text-red-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                                {apiLabel}
                                            </span>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
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
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Define a qualidade do óleo. Óleos mais leves (maior API) têm valor de mercado superior ao Brent.
                                    </p>
                                </div>
                            </div>

                            {/* GOR & MAX LIQUIDS */}
                            <div className="space-y-6">
                                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                        <Beaker size={18} className="text-slate-400 dark:text-slate-500" /> Razão Gás-Óleo (RGO)
                                    </label>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Baixo Gás</span>
                                        <span className="font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-sm font-bold">{params.gor || 150} m³/m³</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Alto Gás</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="500" step="10"
                                        value={params.gor || 150}
                                        onChange={(e) => handleChange('gor', Number(e.target.value))}
                                        className="w-full accent-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                                        Volume de gás produzido por m³ de óleo. Valores altos indicam condensado ou cap de gás.
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                        <Activity size={18} className="text-slate-400 dark:text-slate-500" /> Capacidade de Líquidos (BSW Máx)
                                    </label>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Pequena</span>
                                        <span className="font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-sm font-bold">{((params.maxLiquids || 200000) / 1000).toFixed(0)}k bpd</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Grande</span>
                                    </div>
                                    <input
                                        type="range" min="50000" max="500000" step="10000"
                                        value={params.maxLiquids || 200000}
                                        onChange={(e) => handleChange('maxLiquids', Number(e.target.value))}
                                        className="w-full accent-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
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
