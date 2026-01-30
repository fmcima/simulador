import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Info, Anchor, Zap, Settings, Globe, DollarSign, Box, RotateCw, Pickaxe } from 'lucide-react';
import { formatMillionsNoDecimals, formatCurrency } from '../../utils/calculations';

export default function FpsoCapex({ initialParams, onUpdate, peakProduction = 180 }) {
    // --- 1. State Definitions ---
    // Mode Selection
    const [mode, setMode] = useState(initialParams?.mode || 'detailed'); // 'simple' | 'detailed'
    const [simpleTotal, setSimpleTotal] = useState(initialParams?.simpleTotal || 2500); // $ MM (Default 2.5 Bi)

    // Detailed Params
    const [productionCapacity, setProductionCapacity] = useState(initialParams?.productionCapacity || peakProduction); // kbpd
    const [storageCapacity, setStorageCapacity] = useState('2.0'); // millions bbl
    const [hullType, setHullType] = useState('newbuild'); // 'conversion' | 'newbuild'
    const [complexity, setComplexity] = useState('high'); // 'low' | 'medium' | 'high'
    const [topsidesWeight, setTopsidesWeight] = useState(36000); // tons
    const [isWeightManual, setIsWeightManual] = useState(false);
    const [integrationLoc, setIntegrationLoc] = useState('asia'); // 'asia' | 'brazil'
    const [engFeePct, setEngFeePct] = useState(12); // %

    // --- 2. Hydration from Initial Params ---
    useEffect(() => {
        if (initialParams) {
            if (initialParams.mode) setMode(initialParams.mode);
            if (initialParams.simpleTotal) setSimpleTotal(initialParams.simpleTotal);

            if (initialParams.productionCapacity) setProductionCapacity(initialParams.productionCapacity);
            if (initialParams.storageCapacity) setStorageCapacity(initialParams.storageCapacity);
            if (initialParams.hullType) setHullType(initialParams.hullType);
            if (initialParams.complexity) setComplexity(initialParams.complexity);

            if (initialParams.topsidesWeight) {
                setTopsidesWeight(initialParams.topsidesWeight);
                if (initialParams.isWeightManual !== undefined) {
                    setIsWeightManual(initialParams.isWeightManual);
                } else {
                    const cap = initialParams.productionCapacity || peakProduction;
                    const comp = initialParams.complexity || 'medium';
                    let factor = 0.22;
                    if (comp === 'low') factor = 0.15;
                    if (comp === 'medium') factor = 0.18;
                    const expectedWeight = (cap * 1000) * factor;
                    if (Math.abs(initialParams.topsidesWeight - expectedWeight) < 5) {
                        setIsWeightManual(false);
                    } else {
                        setIsWeightManual(true);
                    }
                }
            }
            if (initialParams.integrationLoc) setIntegrationLoc(initialParams.integrationLoc);
            if (initialParams.engFeePct) setEngFeePct(initialParams.engFeePct);
        }
    }, [initialParams, peakProduction]);

    // --- 3. Auto-Suggestion Logic (Detailed Only) ---
    useEffect(() => {
        if (!isWeightManual && mode === 'detailed') {
            let factor = 0.22; // Default High
            if (complexity === 'low') factor = 0.15;
            if (complexity === 'medium') factor = 0.18;
            const calculatedWeight = (productionCapacity * 1000) * factor;
            setTopsidesWeight(calculatedWeight);
        }
    }, [productionCapacity, complexity, isWeightManual, mode]);

    // --- 4. Calculations ---
    const costs = useMemo(() => {
        if (mode === 'simple') {
            // In Simple Mode, we simulate a breakdown for the chart
            // Hull: 35%, Topsides: 45%, Integration: 15%, Mgmt: 5% (Rough benchmarks)
            return {
                hull: simpleTotal * 0.35,
                topsides: simpleTotal * 0.45,
                integration: simpleTotal * 0.15,
                mgmt: simpleTotal * 0.05,
                subtotal: simpleTotal * 0.95,
                total: simpleTotal
            };
        }

        // Detailed Calculation logic
        let hullBase = hullType === 'newbuild' ? 600 : 350;
        let storageAdder = 0;
        const storageVal = parseFloat(storageCapacity);

        if (hullType === 'newbuild') {
            if (storageVal >= 2.0) storageAdder += 100;
            if (storageVal > 2.0) storageAdder += 50;
        } else {
            if (storageVal >= 2.0) storageAdder += 50;
            if (storageVal > 2.0) storageAdder += 50;
        }

        const hullCost = hullBase + storageAdder;

        const costPerTon = complexity === 'high' ? 0.042 : complexity === 'medium' ? 0.035 : 0.028;
        const topsidesCost = topsidesWeight * costPerTon;

        const integrationFactor = integrationLoc === 'brazil' ? 0.25 : 0.15;
        const integrationCost = (hullCost + topsidesCost) * integrationFactor;

        const subtotal = hullCost + topsidesCost + integrationCost;
        const mgmtCost = subtotal * (engFeePct / 100);
        const total = subtotal + mgmtCost;

        return {
            hull: hullCost,
            topsides: topsidesCost,
            integration: integrationCost,
            mgmt: mgmtCost,
            subtotal,
            total
        };
    }, [mode, simpleTotal, hullType, storageCapacity, complexity, topsidesWeight, integrationLoc, engFeePct]);

    // KPI: Cost per flowing barrel
    const activeCapacity = mode === 'simple' ? peakProduction : productionCapacity;
    const costPerBarrel = (costs.total * 1000000) / (activeCapacity * 1000);

    // Chart Data
    const chartData = [
        { name: 'Casco', value: costs.hull, color: '#3b82f6' },
        { name: 'Topsides', value: costs.topsides, color: '#10b981' },
        { name: 'Integração', value: costs.integration, color: '#f59e0b' },
        { name: 'Engenharia', value: costs.mgmt, color: '#6366f1' },
    ];

    // --- 5. Handlers ---
    const handleWeightChange = (val) => {
        setTopsidesWeight(val);
        setIsWeightManual(true);
    };

    const handleUpdateClick = () => {
        if (onUpdate) {
            const currentConfig = {
                mode,
                simpleTotal,
                productionCapacity,
                storageCapacity,
                hullType,
                complexity,
                topsidesWeight,
                isWeightManual,
                integrationLoc,
                engFeePct
            };
            onUpdate(costs.total, currentConfig);
        }
    };

    const storageInfo = {
        '1.0': { title: "Até 1,0 MM bbl (Pequeno/Médio Porte)", desc: "Unidades convertidas (Aframax/Suezmax) ou para campos menores." },
        '1.6': { title: "De 1,0 a 1,6 MM bbl (Padrão VLCC)", desc: "Faixa comum para conversões de VLCC ou cascos otimizados." },
        '2.0': { title: "De 1,6 a 2,0 MM bbl (Replicantes)", desc: "Grandes projetos e unidades de alta capacidade." },
        '2.5': { title: "Superior a 2,0 MM bbl (Mega FPSOs)", desc: "Maiores campos, geralmente Newbuild." }
    };

    const complexityInfo = {
        'low': { tooltip: "Óleo Pesado/Marginal", driver: "Aço Estrutural e Separação Simples." },
        'medium': { tooltip: "Campos Maduros/Pré-Sal Padrão", driver: "Remoção de Sulfato e Tratamento de Água." },
        'high': { tooltip: "Pré-Sal Gás/CO2 (Mero/Búzios)", driver: "Compressores Alta Pressão e Membranas CO2." }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Mode Selection Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${mode === 'simple' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'} transition-colors`}>
                        <Box size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Modo de Estimativa</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o nível de detalhe do FPSO</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('simple')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'simple'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Simples
                    </button>
                    <button
                        onClick={() => setMode('detailed')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'detailed'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Detalhado
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: INPUTS */}
                <div className="lg:col-span-5 space-y-6">

                    {mode === 'simple' ? (
                        /* SIMPLE MODE CARD */
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <DollarSign className="text-blue-500 w-5 h-5" /> Investimento Total (Estimativa)
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Valor do FPSO ($ MM)</label>
                                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                            $ {simpleTotal.toLocaleString('pt-BR')} MM
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="5000"
                                        step="50"
                                        value={simpleTotal}
                                        onChange={(e) => setSimpleTotal(Number(e.target.value))}
                                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-slate-700"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                        <span>$ 500 MM</span>
                                        <span>$ 5.000 MM</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                    <p><strong>Nota:</strong> No modo simples, o breakdown de custos (Casco, Topsides, etc.) é estimado proporcionalmente baseando-se em benchmarks médios de mercado para facilitar a visualização.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* DETAILED MODE CONTENT */
                        <>
                            {/* CARD 1: Hull & Capacity */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 relative z-10">
                                    <Anchor className="text-blue-500 w-5 h-5" /> Casco e Capacidade
                                </h3>

                                <div className="space-y-4 relative z-10">
                                    {/* Hull Type */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Tipo de Casco</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setHullType('conversion')} className={`p-3 rounded-lg border text-sm font-medium transition-all ${hullType === 'conversion' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Conversão (VLCC)</button>
                                            <button onClick={() => setHullType('newbuild')} className={`p-3 rounded-lg border text-sm font-medium transition-all ${hullType === 'newbuild' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Newbuild (Novo)</button>
                                        </div>
                                    </div>

                                    {/* Production Capacity Slider */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Capacidade de Produção</label>
                                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{productionCapacity} kbpd</span>
                                        </div>
                                        <input type="range" min="80" max="225" step="5" value={productionCapacity} onChange={(e) => setProductionCapacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-slate-700" />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>80k</span><span>225k</span></div>
                                    </div>

                                    {/* Storage Capacity */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Armazenamento</label>
                                        <div className="flex gap-2">
                                            {['1.0', '1.6', '2.0', '2.5'].map(cap => (
                                                <button key={cap} onClick={() => setStorageCapacity(cap)} className={`flex-1 py-2 px-1 rounded text-sm font-bold border transition-all ${storageCapacity === cap ? 'bg-blue-50 text-slate-900 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'}`}>{cap === '2.5' ? '> 2.0' : cap}M bbls</button>
                                            ))}
                                        </div>
                                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">{storageInfo[storageCapacity]?.title}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{storageInfo[storageCapacity]?.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: Topsides */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 relative z-10">
                                    <Zap className="text-emerald-500 w-5 h-5" /> Topsides (Plantas)
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    {/* Complexity */}
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Complexidade de Processo</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['low', 'medium', 'high'].map(lvl => (
                                                <button key={lvl} onClick={() => { setComplexity(lvl); setIsWeightManual(false); }} className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider border transition-all text-left ${complexity === lvl ? (lvl === 'high' ? 'bg-red-50 text-red-600 border-red-200' : lvl === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200') : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700'}`}>{lvl === 'low' ? 'Baixa (Pós-Sal Convencional)' : lvl === 'medium' ? 'Média (Pós-Sal Pesado)' : 'Alta (Pré-Sal/Gás/CO2)'}</button>
                                            ))}
                                        </div>
                                        <div className={`mt-3 p-3 rounded-lg border transition-colors duration-300 ${complexity === 'high' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : complexity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20'}`}>
                                            <p className={`text-[10px] font-bold mb-1 ${complexity === 'high' ? 'text-red-700 dark:text-red-400' : complexity === 'medium' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{complexityInfo[complexity]?.tooltip}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{complexityInfo[complexity]?.driver}</p>
                                        </div>
                                    </div>
                                    {/* Weight Input */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Peso Estimado (Tons)</label>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{topsidesWeight.toLocaleString('pt-BR')} tons</span>
                                        </div>
                                        <input type="range" min="15000" max="60000" step="500" value={topsidesWeight} onChange={(e) => handleWeightChange(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 dark:bg-slate-700" />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>15k</span><span>60k</span></div>
                                        <p className="text-[10px] text-slate-400 mt-2">{isWeightManual ? 'Valor inserido manualmente.' : 'Calculado automaticamente.'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 3: Integration & Fees */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <Globe className="text-amber-500 w-5 h-5" /> Integração & Engenharia
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-col"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">Local de Integração</span><span className="text-xs text-slate-500">Impacta custos (+25% no Brasil)</span></div>
                                        <div className="flex bg-white dark:bg-slate-900 rounded p-1 border border-slate-200 dark:border-slate-700 flex-col sm:flex-row">
                                            <button onClick={() => setIntegrationLoc('asia')} className={`px-3 py-2 rounded text-xs font-bold transition-all ${integrationLoc === 'asia' ? 'bg-blue-50 text-slate-900 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-500' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-slate-200'}`}>Ásia</button>
                                            <button onClick={() => setIntegrationLoc('brazil')} className={`px-3 py-2 rounded text-xs font-bold transition-all ${integrationLoc === 'brazil' ? 'bg-blue-50 text-slate-900 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-500' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-slate-200'}`}>Brasil</button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20">
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col"><span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">Gerenciamento (EPCM)</span><span className="text-[10px] text-amber-600/80 dark:text-amber-500/80">Taxa sobre Hard Costs</span></div>
                                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">12%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                </div>

                {/* RIGHT COLUMN: RESULTS */}
                <div className="lg:col-span-7 space-y-6">
                    {/* BIG NUMBERS CARD */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 justify-center md:justify-start">
                                    <DollarSign size={16} /> CAPEX Total Estimado
                                </div>
                                <div className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                                    $ {Math.round(costs.total).toLocaleString('pt-BR')} MM
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">(Sem contingências)</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-slate-200 dark:border-white/10 min-w-[200px]">
                                <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1">Custo por Barril</p>
                                <div className={`text-2xl font-bold ${costPerBarrel > 16000 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    ${costPerBarrel.toFixed(0)} <span className="text-sm font-normal text-slate-400">/ bpd</span>
                                </div>
                                <div className="mt-3 border-t border-slate-200 dark:border-white/10 pt-3">
                                    <button onClick={handleUpdateClick} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm active:scale-95">
                                        <RotateCw size={14} /> Atualizar Projeto
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS & TABLE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">{mode === 'simple' ? 'Breakdown Estimado (Padrão)' : 'Breakdown de Custos'}</h4>
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = outerRadius + 20;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                        const textAnchor = x > cx ? 'start' : 'end';
                                        return (
                                            <text x={x} y={y} fill="#64748b" textAnchor={textAnchor} dominantBaseline="central" fontSize={11} className="dark:fill-slate-400">
                                                {name}
                                                <tspan x={x} dy="14" fontSize={10} fontWeight="bold">$ {Math.round(value).toLocaleString('pt-BR')} MM ({(percent * 100).toFixed(0)}%)</tspan>
                                            </text>
                                        );
                                    }}>
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />)}
                                    </Pie>
                                    <Tooltip formatter={(val) => `$${val.toFixed(0)}M`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 overflow-auto">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Detalhamento (USD Milhões)</h4>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    <tr className="group"><td className="py-2 text-slate-500 dark:text-slate-400">Casco e Naval</td><td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">$ {Math.round(costs.hull).toLocaleString('pt-BR')}</td></tr>
                                    <tr className="group"><td className="py-2 text-slate-500 dark:text-slate-400">Topsides (Plantas)</td><td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">$ {Math.round(costs.topsides).toLocaleString('pt-BR')}</td></tr>
                                    <tr className="group"><td className="py-2 text-slate-500 dark:text-slate-400">Integração</td><td className="py-2 text-right font-medium text-slate-700 dark:text-slate-300">$ {Math.round(costs.integration).toLocaleString('pt-BR')}</td></tr>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold"><td className="py-2 pl-2 text-slate-700 dark:text-slate-200">Subtotal Direto</td><td className="py-2 pr-2 text-right text-slate-800 dark:text-slate-100">$ {Math.round(costs.subtotal).toLocaleString('pt-BR')}</td></tr>
                                    <tr className="group"><td className="py-2 text-slate-500 dark:text-slate-400">Engenharia & Gestão</td><td className="py-2 text-right font-medium text-amber-600">+$ {Math.round(costs.mgmt).toLocaleString('pt-BR')}</td></tr>
                                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 text-base"><td className="py-3 font-bold text-slate-900 dark:text-white">CAPEX TOTAL</td><td className="py-3 text-right font-bold text-blue-600 dark:text-blue-400">$ {Math.round(costs.total).toLocaleString('pt-BR')}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* DISCLAIMER */}
                <div className="col-span-1 lg:col-span-12 mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h5 className="font-bold mb-1">Nota Metodológica e Fontes:</h5>
                        <p className="opacity-90 leading-relaxed">As estimativas baseiam-se em benchmarks de mercado para o cenário "Upcycle" de 2026. Fontes: S&P Global (UCCI) e Rystad Energy.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
