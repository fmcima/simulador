import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { Box, DollarSign, Pickaxe, Timer, Activity, TrendingDown, Anchor, Wrench, Cpu, Check, RotateCw, Info, TrendingUp, Play, Loader2 } from 'lucide-react';
import { generateProjectData } from '../../utils/calculations';

export default function WellsCapex({ costs, onUpdate, initialParams, projectParams, unitNpv }) {
    // Mode: 'simple' (Total Value) or 'detailed' (Number of Wells)
    const [mode, setMode] = useState(initialParams?.mode || 'simple');

    // Simple Mode State
    const [simpleTotal, setSimpleTotal] = useState(initialParams?.simpleTotal || 2400); // $ MM

    // Detailed Mode State
    const [numProducers, setNumProducers] = useState(initialParams?.numProducers || 8);
    const [numInjectors, setNumInjectors] = useState(initialParams?.numInjectors || 8);
    const numWells = numProducers + numInjectors;

    // Duration & Complexity
    const [wellType, setWellType] = useState(initialParams?.wellType || 'pre'); // 'post' | 'pre'
    const [complexity, setComplexity] = useState(initialParams?.complexity || 'high'); // 'low' | 'high'

    // Durations (Days) - Treated as T1 (First Well) if Learning Curve is active
    const [drillingDays, setDrillingDays] = useState(initialParams?.drillingDays || 90);
    const [completionDays, setCompletionDays] = useState(initialParams?.completionDays || 35);
    const [connectionDays, setConnectionDays] = useState(initialParams?.connectionDays || 15);
    const [npt, setNpt] = useState(initialParams?.npt || 18); // %

    // Learning Curve State
    const [useLearningCurve, setUseLearningCurve] = useState(initialParams?.useLearningCurve !== undefined ? initialParams.useLearningCurve : true);
    const [learningRate, setLearningRate] = useState(initialParams?.learningRate || 0.90);

    // --- NEW: Rates & Materials State ---
    const [rigRate, setRigRate] = useState(initialParams?.rigRate || 490); // $k/day
    const [serviceRate, setServiceRate] = useState(initialParams?.serviceRate || 440); // $k/day

    const [casingCost, setCasingCost] = useState(initialParams?.casingCost || 24); // $ MM
    const [tubingCost, setTubingCost] = useState(initialParams?.tubingCost || 18.5); // $ MM
    const [anmCost, setAnmCost] = useState(initialParams?.anmCost || 7.5); // $ MM

    // --- NEW: Smart Well Technology State ---
    const [useSmartWell, setUseSmartWell] = useState(initialParams?.useSmartWell || false);
    const [smartWellCount, setSmartWellCount] = useState(initialParams?.smartWellCount || 5);

    // --- NEW: FOH Technology State ---
    const [useFOH, setUseFOH] = useState(initialParams?.useFOH || false);
    const [fohReductionDays, setFohReductionDays] = useState(initialParams?.fohReductionDays || 16);
    const [fohHardwareCostIncrease, setFohHardwareCostIncrease] = useState(initialParams?.fohHardwareCostIncrease || 20); // %
    const [fohRecoveryFactorIncrease, setFohRecoveryFactorIncrease] = useState(initialParams?.fohRecoveryFactorIncrease || 5); // %

    // --- Monte Carlo Simulation State ---
    const [isSimulating, setIsSimulating] = useState(false);
    const [monteCarloResults, setMonteCarloResults] = useState(null);

    // --- Monte Carlo Distribution Helpers ---
    const triangularRandom = (min, mode, max) => {
        const u = Math.random();
        const fc = (mode - min) / (max - min);
        if (u < fc) {
            return min + Math.sqrt(u * (max - min) * (mode - min));
        } else {
            return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }
    };

    const normalRandom = (mean, stdDev) => {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    };

    // --- Monte Carlo Run Function ---
    const runMonteCarlo = async () => {
        setIsSimulating(true);
        setMonteCarloResults(null);

        // Use setTimeout to allow UI to update before heavy computation
        await new Promise(resolve => setTimeout(resolve, 50));

        const iterations = 5000;

        // Base parameters from projectParams (these will be overridden per configuration)
        const baseParams = { ...projectParams };

        // Get the base CAPEX from the Wells Capex component
        const baseWellsCapex = (costs?.totalMM || 2400) * 1000000;

        // Configuration Definitions with their parameter distributions
        const configs = {
            'Convencional': {
                capexMult: () => 1.0,
                rigMult: () => 1.0,
                waitDays: () => triangularRandom(90, 120, 180),
                declineRate: () => normalRandom(12, 2), // % value
                hyperbolicFactor: () => triangularRandom(0.1, 0.3, 0.4),
                breakthroughYears: () => triangularRandom(3, 5, 6),
                waterGrowthK: () => triangularRandom(0.8, 1.2, 1.5)
            },
            'Inteligente Hidráulica': {
                capexMult: () => triangularRandom(1.05, 1.10, 1.20),
                rigMult: () => 1.0,
                waitDays: () => 0,
                declineRate: () => normalRandom(9, 1.5), // % value
                hyperbolicFactor: () => triangularRandom(0.3, 0.5, 0.6),
                breakthroughYears: () => triangularRandom(5, 7, 9),
                waterGrowthK: () => triangularRandom(0.5, 0.7, 0.9)
            },
            'Inteligente Elétrica': {
                capexMult: () => triangularRandom(1.01, 1.15, 1.25),
                rigMult: () => 1.2,
                waitDays: () => 0,
                declineRate: () => normalRandom(6, 1), // % value
                hyperbolicFactor: () => triangularRandom(0.6, 0.7, 0.9),
                breakthroughYears: () => triangularRandom(7, 9, 12),
                waterGrowthK: () => triangularRandom(0.3, 0.4, 0.6)
            }
        };

        const results = {};
        const allCategoryData = {}; // Store raw npvs for second pass

        // FIRST PASS: Collect all NPV values to determine global range
        let globalMin = Infinity;
        let globalMax = -Infinity;

        for (const [configName, samplers] of Object.entries(configs)) {
            const npvs = [];

            for (let i = 0; i < iterations; i++) {
                // Sample parameters for this iteration
                const capexMult = samplers.capexMult();
                const rigMult = samplers.rigMult();
                const declineRate = Math.max(1, samplers.declineRate()); // Ensure positive %
                const hyperbolicFactor = Math.max(0, Math.min(1, samplers.hyperbolicFactor()));
                const breakthroughYears = samplers.breakthroughYears();
                const waterGrowthK = samplers.waterGrowthK();

                // Calculate adjusted CAPEX - apply multiplier delta to the TOTAL project capex
                // capexMult affects only wells portion, so we calculate the delta
                const wellsCapexDelta = baseWellsCapex * (capexMult * rigMult - 1);
                const adjustedTotalCapex = (projectParams?.totalCapex || 5400000000) + wellsCapexDelta;

                // Build iteration params - override the varied parameters
                const iterParams = {
                    ...baseParams,
                    totalCapex: adjustedTotalCapex,
                    declineRate: declineRate,
                    hyperbolicFactor: hyperbolicFactor,
                    bswBreakthrough: breakthroughYears,
                    bswGrowthRate: waterGrowthK
                };

                // Call the actual project calculation
                try {
                    const result = generateProjectData(iterParams);
                    if (result && result.metrics && typeof result.metrics.vpl === 'number' && isFinite(result.metrics.vpl)) {
                        npvs.push(result.metrics.vpl / 1000000); // Convert to MM
                    }
                } catch (e) {
                    // Skip failed iterations
                    console.warn('Monte Carlo iteration failed:', e);
                }
            }

            // Store for second pass
            if (npvs.length > 0) {
                npvs.sort((a, b) => a - b);
                allCategoryData[configName] = npvs;
                // Update global range
                globalMin = Math.min(globalMin, npvs[0]);
                globalMax = Math.max(globalMax, npvs[npvs.length - 1]);
            } else {
                allCategoryData[configName] = [];
            }
        }

        // SECOND PASS: Generate histograms with unified bins
        const binCount = 20;
        const binWidth = globalMax > globalMin ? (globalMax - globalMin) / binCount : 1;

        for (const [configName, npvs] of Object.entries(allCategoryData)) {
            if (npvs.length > 0) {
                const mean = npvs.reduce((a, b) => a + b, 0) / npvs.length;
                const p10Index = Math.floor(0.10 * npvs.length);
                const p50Index = Math.floor(0.50 * npvs.length);
                const p90Index = Math.floor(0.90 * npvs.length);

                // Generate histogram with global bins
                const histogram = [];
                for (let b = 0; b < binCount; b++) {
                    const binStart = globalMin + b * binWidth;
                    const binEnd = binStart + binWidth;
                    const count = npvs.filter(v => v >= binStart && v < binEnd).length;
                    histogram.push({
                        bin: (binStart / 1000).toFixed(2), // Convert to Billions
                        value: binStart,
                        frequency: count,
                        probability: (count / npvs.length * 100).toFixed(1)
                    });
                }

                results[configName] = {
                    mean: mean,
                    p10: npvs[p10Index],
                    p50: npvs[p50Index],
                    p90: npvs[p90Index],
                    count: npvs.length,
                    histogram: histogram
                };
            } else {
                results[configName] = {
                    mean: 0,
                    p10: 0,
                    p50: 0,
                    p90: 0,
                    count: 0,
                    histogram: []
                };
            }
        }

        setMonteCarloResults(results);
        setIsSimulating(false);
    };

    // --- EFFECT: Update Defaults based on Type & Complexity ---
    useEffect(() => {
        // Only reset if we are not initializing from existing params (simple check: if defaults don't match logic)
        // For simplicity in this interaction, we force update when Type/Complexity changes significantly
        // User can then fine-tune via sliders.

        if (wellType === 'post') {
            // -- POST SALT DEFAULTS --
            // Durations
            if (complexity === 'low') {
                setDrillingDays(30); setCompletionDays(15); setConnectionDays(5); setNpt(10);
            } else {
                setDrillingDays(45); setCompletionDays(20); setConnectionDays(10); setNpt(12);
            }
            // Rates
            setRigRate(385); // Avg of 350-420
            setServiceRate(340); // Avg of 300-380
            // Materials
            setCasingCost(10); // Avg of 8-12
            setTubingCost(9); // Avg of 8-10
            setAnmCost(4.5); // Avg of 4-5

        } else {
            // -- PRE SALT DEFAULTS --
            // Durations
            if (complexity === 'low') {
                setDrillingDays(60); setCompletionDays(25); setConnectionDays(10); setNpt(15);
            } else {
                setDrillingDays(90); setCompletionDays(35); setConnectionDays(15); setNpt(18);
            }
            // Rates
            setRigRate(490); // Avg of 460-520
            setServiceRate(440); // Avg of 400-480
            // Materials
            setCasingCost(24); // Avg of 20-28
            setTubingCost(18.5); // Avg of 15-22
            setAnmCost(7.5); // Avg of 6-9
        }
    }, [wellType, complexity]);

    // Ensure smartWellCount doesn't exceed total wells
    useEffect(() => {
        if (smartWellCount > numWells) {
            setSmartWellCount(numWells);
        }
    }, [numWells, smartWellCount]);


    // Detailed Calculation
    const t1Days = drillingDays + completionDays + connectionDays; // Days for First Well (without NPT)
    const nptFactor = 1 + (npt / 100);
    const t1WithNpt = t1Days * nptFactor;

    // Calculate Campaign Days with Learning Curve
    // Tn = T1 * n^b
    // b = log(LR) / log(2)
    // Technical floor = 0.6 * T1
    const calculateTotalCampaignDays = () => {
        if (!useLearningCurve) return t1WithNpt * numWells;

        let totalDays = 0;
        const b = Math.log(learningRate) / Math.log(2);
        const limit = t1WithNpt * 0.60;

        for (let i = 1; i <= numWells; i++) {
            let tn = t1WithNpt * Math.pow(i, b);
            if (tn < limit) tn = limit;
            totalDays += tn;
        }
        return totalDays;
    };

    const totalCampaignDaysRaw = calculateTotalCampaignDays();
    const reductionSmartWell = (useSmartWell && useFOH) ? (fohReductionDays * smartWellCount) : 0;
    const totalCampaignDays = Math.max(0, totalCampaignDaysRaw - reductionSmartWell);

    // Average Days per Well (Weighted)
    const avgDaysPerWell = totalCampaignDays / numWells;

    const dailyCostTotal = (totalCampaignDays * (rigRate + serviceRate)) / 1000; // $ MM

    // Materials Cost Calculation with FOH Hardware Increase
    const baseMaterialsCostPerWell = casingCost + tubingCost + anmCost;
    let materialsCostTotal = baseMaterialsCostPerWell * numWells;

    if (useSmartWell && useFOH) {
        const extraCostPerSmartWell = baseMaterialsCostPerWell * (fohHardwareCostIncrease / 100);
        materialsCostTotal += extraCostPerSmartWell * smartWellCount;
    }

    // Per Well Costs (Weighted Average)
    const dailyCostPerWellAvg = dailyCostTotal / numWells;
    const materialsCostPerWell = casingCost + tubingCost + anmCost;

    const calculatedCostPerWell = dailyCostPerWellAvg + materialsCostPerWell; // $ MM
    const currentTotal = mode === 'simple' ? simpleTotal : dailyCostTotal + materialsCostTotal;

    // Chart Data
    // Chart Data Logic
    let chartData = [];

    if (mode === 'simple') {
        chartData = [
            { name: 'Perfuração', value: currentTotal * 0.45, color: '#10b981' },
            { name: 'Complet.', value: currentTotal * 0.35, color: '#3b82f6' },
            { name: 'Logística', value: currentTotal * 0.20, color: '#f59e0b' },
        ];
    } else {
        // DETAILED MODE BREAKDOWN
        // 1. Calculate Ratios for Rig Time Allocation
        const baseDrillDays = drillingDays + connectionDays;
        const baseCompDays = completionDays;
        const totalBaseDays = baseDrillDays + baseCompDays;

        const drillRatio = totalBaseDays > 0 ? baseDrillDays / totalBaseDays : 0.6;
        const compRatio = totalBaseDays > 0 ? baseCompDays / totalBaseDays : 0.4;

        // 2. Calculate Absolute Costs ($ MM)
        // Logistics = Total Service Cost (Service Rate applies to all days)
        const logisticsCost = (totalCampaignDays * serviceRate) / 1000;

        // Rig Cost Total
        const totalRigCost = (totalCampaignDays * rigRate) / 1000;

        // Drilling Category = Rig Share + Casing
        const drillRigCost = totalRigCost * drillRatio;
        const drillMatCost = casingCost * numWells;
        const drillingTotal = drillRigCost + drillMatCost;

        // Completion Category = Rig Share + Tubing + ANM
        const compRigCost = totalRigCost * compRatio;
        const compMatCost = (tubingCost + anmCost) * numWells;
        const completionTotal = compRigCost + compMatCost;

        chartData = [
            { name: 'Perfuração', value: drillingTotal, color: '#10b981' },
            { name: 'Complet.', value: completionTotal, color: '#3b82f6' },
            { name: 'Logística', value: logisticsCost, color: '#f59e0b' },
        ];
    }

    // --- Persistence Logic: Save on Unmount & Manual Update ---
    const currentConfig = {
        mode,
        simpleTotal,
        numWells,
        numProducers,
        numInjectors,
        calculatedCostPerWell,
        wellType,
        complexity,
        drillingDays,
        completionDays,
        connectionDays,
        npt,
        rigRate,
        serviceRate,
        casingCost,
        tubingCost,
        anmCost,
        useLearningCurve,
        learningRate,
        avgDaysPerWell,
        totalCampaignDays,
        useSmartWell,
        smartWellCount,
        useFOH,
        fohReductionDays,
        fohHardwareCostIncrease,
        fohRecoveryFactorIncrease
    };

    // Refs to hold latest values for cleanup function
    const configRef = useRef(currentConfig);
    const totalRef = useRef(currentTotal);

    // Update refs on every render
    configRef.current = currentConfig;
    totalRef.current = currentTotal;

    // Save state when component unmounts (e.g. switching tabs)
    useEffect(() => {
        return () => {
            if (onUpdate) {
                onUpdate(totalRef.current, configRef.current);
            }
        };
    }, []);

    const handleUpdateClick = () => {
        if (onUpdate) {
            onUpdate(currentTotal, currentConfig);
        }
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o nível de detalhe do projeto</p>
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
                <div className="lg:col-span-6 space-y-6">

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
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Valor Estimado ($ MM)</label>
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
                                        <span>$ 5.0 Bi</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                    <p><strong>Nota:</strong> No modo simples, o breakdown de custos (Perfuração, Completação, etc.) é estimado proporcionalmente (45/35/20) para facilitar a visualização.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* DETAILED MODE CONTENT */
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 relative z-10">
                                <Pickaxe className="text-emerald-500 w-5 h-5" /> Configuração de Poços
                            </h3>

                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                {/* Number of Wells (Split) */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Quantidade de Poços</label>
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{numWells} poços</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* PRODUCERS */}
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">Poços Produtores</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setNumProducers(Math.max(1, numProducers - 1))}
                                                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 transition-colors font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    min="1" max="50"
                                                    value={numProducers}
                                                    onChange={(e) => setNumProducers(Math.max(1, Number(e.target.value)))}
                                                    className="w-full h-8 text-center text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                                <button
                                                    onClick={() => setNumProducers(numProducers + 1)}
                                                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 transition-colors font-bold"
                                                >+</button>
                                            </div>
                                        </div>

                                        {/* INJECTORS */}
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">Poços Injetores</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setNumInjectors(Math.max(0, numInjectors - 1))}
                                                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300 transition-colors font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    min="0" max="50"
                                                    value={numInjectors}
                                                    onChange={(e) => setNumInjectors(Math.max(0, Number(e.target.value)))}
                                                    className="w-full h-8 text-center text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => setNumInjectors(numInjectors + 1)}
                                                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300 transition-colors font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800" />

                                {/* Well Type & Complexity Selectors */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Tipo de Poço</label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setWellType('post')}
                                                className={`p-2 rounded border text-xs font-bold transition-all ${wellType === 'post'
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Pós-Sal (Águas Profundas)
                                            </button>
                                            <button
                                                onClick={() => setWellType('pre')}
                                                className={`p-2 rounded border text-xs font-bold transition-all ${wellType === 'pre'
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Pré-Sal (Ultraprofundas)
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Complexidade</label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setComplexity('low')}
                                                className={`p-2 rounded border text-xs font-bold transition-all ${complexity === 'low'
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Baixa
                                            </button>
                                            <button
                                                onClick={() => setComplexity('high')}
                                                className={`p-2 rounded border text-xs font-bold transition-all ${complexity === 'high'
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Alta
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* DURATION SECTION with Learning Curve */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Timer size={14} className="text-slate-400" /> Cronograma (Dias)
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">
                                                    {useLearningCurve ? 'Dias/Poço (Méd)' : 'Dias/Poço'}
                                                </p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {useLearningCurve ? avgDaysPerWell.toFixed(1) : t1WithNpt.toFixed(1)}d
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Campanha</p>
                                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(totalCampaignDays).toLocaleString('pt-BR')}d</p>
                                            </div>
                                        </div>
                                    </h4>

                                    {/* Learning Curve Toggle */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Curva de Aprendizado</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={useLearningCurve}
                                                    onChange={(e) => setUseLearningCurve(e.target.checked)}
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </div>

                                        {useLearningCurve && (
                                            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500 uppercase">Eficiência (Taxa de Aprendizado)</label>
                                                    <span className="text-[10px] font-bold text-emerald-600">{(learningRate * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setLearningRate(0.95)}
                                                        className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${learningRate === 0.95
                                                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                                                            : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}
                                                    >
                                                        Conservador (95%)
                                                    </button>
                                                    <button
                                                        onClick={() => setLearningRate(0.90)}
                                                        className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${learningRate === 0.90
                                                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                                                            : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}
                                                    >
                                                        Padrão (90%)
                                                    </button>
                                                    <button
                                                        onClick={() => setLearningRate(0.85)}
                                                        className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${learningRate === 0.85
                                                            ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                                                            : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}
                                                    >
                                                        Alta Perf. (85%)
                                                    </button>
                                                </div>

                                                <div className="mt-3 p-2 rounded bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-[10px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                                                    <p><strong>Conceito:</strong> Aplica o modelo de potência (Lei de Wright). O tempo de perfuração decai progressivamente a cada poço repetido ($T_n = T_1 \times n^b$) até atingir o Limite Técnico (Plateau).</p>
                                                </div>
                                                <div className="mt-2 text-[9px] text-slate-400 flex justify-between">
                                                    <span>1º Poço: <b>{t1WithNpt.toFixed(0)}d</b></span>
                                                    <span>Limite Técnico: <b>{(t1WithNpt * 0.6).toFixed(0)}d</b></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Drilling */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">
                                                Perfuração {useLearningCurve ? '(Base 1º Poço)' : ''}
                                            </label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{drillingDays}d</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'post' ? 20 : 40}
                                            max={wellType === 'post' ? 60 : 120}
                                            step="1"
                                            value={drillingDays}
                                            onChange={(e) => setDrillingDays(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500 dark:bg-slate-700"
                                        />
                                    </div>

                                    {/* Completion */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">
                                                Completação {useLearningCurve ? '(Base 1º Poço)' : ''}
                                            </label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{completionDays}d</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'post' ? 10 : 15}
                                            max={wellType === 'post' ? 40 : 60}
                                            step="1"
                                            value={completionDays}
                                            onChange={(e) => setCompletionDays(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500 dark:bg-slate-700"
                                        />
                                    </div>

                                    {/* Connection + NPT */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-medium text-slate-500">Conexão</label>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{connectionDays}d</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="15" step="1"
                                                value={connectionDays} onChange={(e) => setConnectionDays(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-medium text-slate-500">NPT</label>
                                                <span className="text-xs font-bold text-amber-600">{npt}%</span>
                                            </div>
                                            <input
                                                type="range" min={wellType === 'post' ? 8 : 12} max={wellType === 'post' ? 15 : 20} step="0.5"
                                                value={npt} onChange={(e) => setNpt(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* RATES & LOGISTICS SECTION */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-slate-400" /> Taxas Diárias (Sonda & Serviços)
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Sonda+Serv (Poço)</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {dailyCostPerWellAvg.toFixed(1)} MM</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Total</p>
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">$ {(dailyCostTotal).toFixed(0)} MM</p>
                                            </div>
                                        </div>
                                    </h4>

                                    {/* Rig Info Card */}
                                    <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                        <div className="flex items-start gap-2">
                                            <Anchor className="w-4 h-4 text-blue-600 mt-1 shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                                                    {wellType === 'pre' ? 'Sonda "High-Spec" (Pré-Sal)' : 'Sonda Convencional (Pós-Sal)'}
                                                </p>
                                                <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 leading-relaxed mt-1">
                                                    {wellType === 'pre'
                                                        ? "Drillship 7ª/8ª Geração, Dual Derrick, MPD instalado. Necessária para janela de pressão estreita e lâmina d'água ultraprofunda (>2000m)."
                                                        : "Semisubmersível ou Drillship Padrão (5ª/6ª Geração). Adequada para águas profundas (até 2000m) sem MPD obrigatório."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rig Rate Slider */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">Taxa Diária de Sonda ($k/dia)</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {rigRate}k</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'pre' ? 460 : 350}
                                            max={wellType === 'pre' ? 520 : 420}
                                            step="5"
                                            value={rigRate}
                                            onChange={(e) => setRigRate(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-slate-700"
                                        />
                                        <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                            <span>$ {wellType === 'pre' ? 460 : 350}k</span>
                                            <span>$ {wellType === 'pre' ? 520 : 420}k</span>
                                        </div>
                                    </div>

                                    {/* Service Logic Info */}
                                    <div className="mt-2">
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">Serviços & Logística ($k/dia)</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {serviceRate}k</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'pre' ? 400 : 300}
                                            max={wellType === 'pre' ? 480 : 380}
                                            step="5"
                                            value={serviceRate}
                                            onChange={(e) => setServiceRate(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-slate-700"
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1">
                                            {wellType === 'pre'
                                                ? 'Inclui barcos (PSV), helicópteros (longa distância), fluidos sintéticos e tratamento de resíduos pesados.'
                                                : 'Base logística próxima (Macaé/Açu), menor consumo de combustível e fluidos convencionais.'}
                                        </p>
                                    </div>
                                </div>

                                {/* MATERIALS SECTION */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Wrench size={14} className="text-slate-400" /> Materiais & Equipamentos
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Mat. (Poço)</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {materialsCostPerWell.toFixed(1)} MM</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase">Total</p>
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">$ {(materialsCostTotal).toFixed(0)} MM</p>
                                            </div>
                                        </div>
                                    </h4>
                                    <div className="p-3 mb-2 rounded bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                                            {wellType === 'pre'
                                                ? 'Ambiente rico em CO2/H2S exige ligas especiais (CRA - Corrosion Resistant Alloys) para Revestimentos, Tubing e ANM.'
                                                : 'Uso predominante de Aço Carbono. Metalurgia padrão reduz custos significativamente.'}
                                        </p>
                                    </div>

                                    {/* Casing */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">Revestimentos (Casing)</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {casingCost} MM</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'pre' ? 20 : 8}
                                            max={wellType === 'pre' ? 28 : 12}
                                            step="0.5"
                                            value={casingCost}
                                            onChange={(e) => setCasingCost(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:bg-slate-700"
                                        />
                                    </div>

                                    {/* Tubing */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">Tubing & Completação</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {tubingCost} MM</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'pre' ? 15 : 8}
                                            max={wellType === 'pre' ? 22 : 10}
                                            step="0.5"
                                            value={tubingCost}
                                            onChange={(e) => setTubingCost(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:bg-slate-700"
                                        />
                                    </div>

                                    {/* ANM */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500">ANM (Árvore de Natal)</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {anmCost} MM</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={wellType === 'pre' ? 6 : 4}
                                            max={wellType === 'pre' ? 9 : 5}
                                            step="0.5"
                                            value={anmCost}
                                            onChange={(e) => setAnmCost(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:bg-slate-700"
                                        />
                                    </div>
                                </div>

                                {/* SMART WELL TECHNOLOGY SECTION */}
                                <div className="space-y-4 pt-2">
                                    {/* Smart Well Toggle */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-4 h-4 text-purple-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tecnologia Smart Well</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={useSmartWell}
                                                    onChange={(e) => setUseSmartWell(e.target.checked)}
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>

                                        {useSmartWell && (
                                            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                                                <div className="p-2 mb-3 rounded bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 text-[10px] text-purple-800 dark:text-purple-300 leading-relaxed">
                                                    <p><strong>Benefício:</strong> Permite controle remoto de zonas e monitoramento em tempo real, potencialmente aumentando o fator de recuperação, mas com maior custo inicial.</p>
                                                </div>

                                                {/* Smart Well Count Slider */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-[10px] font-medium text-slate-500 uppercase">
                                                            Poços com Smart Well
                                                        </label>
                                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                            {smartWellCount} poços
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={numWells}
                                                        step="1"
                                                        value={smartWellCount}
                                                        onChange={(e) => setSmartWellCount(Number(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:bg-slate-700"
                                                    />
                                                    <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                                        <span>0</span>
                                                        <span>{numWells} (Todos)</span>
                                                    </div>
                                                </div>

                                                {/* FOH Section */}
                                                <div className="mt-4 border-t border-purple-100 dark:border-purple-900/30 pt-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                                checked={useFOH}
                                                                onChange={(e) => setUseFOH(e.target.checked)}
                                                            />
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                Full Open Hole Intelligent Completion (FOH)
                                                            </span>
                                                        </label>
                                                    </div>

                                                    {useFOH && (
                                                        <div className="pl-6 animate-in fade-in slide-in-from-top-1 space-y-3">
                                                            <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 text-[10px] text-purple-800 dark:text-purple-300">
                                                                <p>Reduz o tempo de construção eliminando etapas de cimentação e canhoneio.</p>
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between mb-1">
                                                                    <label className="text-[10px] font-medium text-slate-500 uppercase">
                                                                        Redução de Tempo (Dias/Poço)
                                                                    </label>
                                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                                        -{fohReductionDays} dias
                                                                    </span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="10"
                                                                    max="25"
                                                                    step="1"
                                                                    value={fohReductionDays}
                                                                    onChange={(e) => setFohReductionDays(Number(e.target.value))}
                                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:bg-slate-700"
                                                                />
                                                                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                                                    <span>10 dias</span>
                                                                    <span>25 dias</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-slate-500">Economia Total na Campanha: </span>
                                                                <span className="text-xs font-bold text-emerald-600">
                                                                    -{Math.round(reductionSmartWell).toLocaleString('pt-BR')} dias
                                                                </span>
                                                            </div>

                                                            <div className="border-t border-purple-100 dark:border-purple-900/30 pt-2 mt-2">
                                                                <div className="flex justify-between mb-1">
                                                                    <label className="text-[10px] font-medium text-slate-500 uppercase">
                                                                        Custo de Hardware (Equipamentos)
                                                                    </label>
                                                                    <span className="text-xs font-bold text-amber-600">
                                                                        +{fohHardwareCostIncrease}%
                                                                    </span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="10"
                                                                    max="35"
                                                                    step="1"
                                                                    value={fohHardwareCostIncrease}
                                                                    onChange={(e) => setFohHardwareCostIncrease(Number(e.target.value))}
                                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-slate-700"
                                                                />
                                                                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                                                    <span>10%</span>
                                                                    <span>35%</span>
                                                                </div>
                                                                <div className="mt-2 text-[9px] text-slate-400 italic">
                                                                    * Aumento devido ao uso de packers expansíveis com feed-through e válvulas mais robustas.
                                                                </div>
                                                            </div>

                                                            {/* Recovery Factor Increase Input */}
                                                            <div className="border-t border-purple-100 dark:border-purple-900/30 pt-2 mt-2">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label className="text-[10px] font-medium text-slate-500 uppercase">
                                                                        Aumento do Fator de Recuperação
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Decrease Button */}
                                                                        <button
                                                                            onClick={() => setFohRecoveryFactorIncrease(Math.max(1, fohRecoveryFactorIncrease - 1))}
                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                                                                        >
                                                                            -
                                                                        </button>

                                                                        {/* Value Display */}
                                                                        <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded px-2 py-0.5 min-w-[3rem] text-center">
                                                                            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                                                                                {fohRecoveryFactorIncrease}%
                                                                            </span>
                                                                        </div>

                                                                        {/* Increase Button */}
                                                                        <button
                                                                            onClick={() => setFohRecoveryFactorIncrease(Math.min(10, fohRecoveryFactorIncrease + 1))}
                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-900/10 text-[9px] text-emerald-800 dark:text-emerald-300 leading-relaxed italic border border-emerald-100/50 dark:border-emerald-900/20 mb-3">
                                                                    O aumento médio do fator de recuperação varia de 4% a 6% ao otimizar a drenagem do reservatório.
                                                                </div>

                                                                {/* INCREMENTAL VALUES */}
                                                                {(() => {
                                                                    if (!projectParams) return null;
                                                                    const { peakProduction = 150, rampUpDuration = 3, plateauDuration = 4, projectDuration = 30, baseDeclineRate, declineRate } = projectParams;
                                                                    const baseDec = baseDeclineRate || declineRate || 8;

                                                                    // Calculate Volume Helper
                                                                    const calcVol = (dec) => {
                                                                        let total = 0;
                                                                        for (let t = 1; t <= projectDuration; t++) {
                                                                            let vol = 0;
                                                                            if (t <= rampUpDuration) vol = peakProduction * (t / rampUpDuration);
                                                                            else if (t <= rampUpDuration + plateauDuration) vol = peakProduction;
                                                                            else {
                                                                                const post = t - (rampUpDuration + plateauDuration);
                                                                                vol = peakProduction * Math.pow(1 - dec / 100, post);
                                                                            }
                                                                            total += vol * 365;
                                                                        }
                                                                        return total / 1000; // MMbbl
                                                                    };

                                                                    const volBase = calcVol(baseDec);
                                                                    const optimizedDec = baseDec / (1 + fohRecoveryFactorIncrease / 100);
                                                                    const volOpt = calcVol(optimizedDec);
                                                                    const deltaVol = volOpt - volBase;
                                                                    const deltaNpv = deltaVol * (unitNpv || 5); // $ MM

                                                                    return (
                                                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/30 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                                            <h5 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-2 flex items-center gap-1">
                                                                                <TrendingUp className="w-3 h-3" /> Valor Agregado Estimado
                                                                            </h5>
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 block">Volume Adicional</span>
                                                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+{deltaVol.toFixed(1)} MMbbl</span>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 block">VPL Incremental</span>
                                                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+$ {deltaNpv.toFixed(1)} MM</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}
                </div>

                {/* RIGHT COLUMN: RESULTS */}
                < div className="lg:col-span-6 space-y-6" >

                    {mode === 'detailed' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dias / Poço</p>
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{useLearningCurve ? avgDaysPerWell.toFixed(1) : t1WithNpt.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400">{useLearningCurve ? 'Média' : 'Total com NPT'}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Campanha</p>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(totalCampaignDays).toLocaleString('pt-BR')}</p>
                                <p className="text-[10px] text-slate-400">Dias (Sonda Única)</p>
                            </div>
                            <div className="col-span-2 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                <div className="flex justify-between items-center h-full">
                                    <div>
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold mb-1">Custo Calculado</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">$ {calculatedCostPerWell.toFixed(1)} MM</p>
                                        <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60">por poço (Médio)</p>
                                    </div>
                                    <Activity className="text-emerald-300 w-8 h-8" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BIG NUMBERS CARD */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 justify-center md:justify-start">
                                    <DollarSign size={16} /> CAPEX de Poços Estimado
                                </div>
                                <div className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
                                    $ {Math.round(currentTotal).toLocaleString('pt-BR')} MM
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-slate-200 dark:border-white/10 min-w-[200px]">
                                <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1">Custo Total</p>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    $ {(currentTotal / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-400">Bi</span>
                                </div>

                                {/* UPDATE PROJECT BUTTON */}
                                <div className="mt-3 border-t border-slate-200 dark:border-white/10 pt-3">
                                    <button
                                        onClick={handleUpdateClick}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm active:scale-95"
                                    >
                                        <RotateCw size={14} />
                                        Atualizar Projeto
                                    </button>
                                    <p className="text-[9px] text-center text-slate-400 mt-2">
                                        As alterações também são salvas automaticamente ao trocar de aba.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CHART & BREAKDOWN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* DONUT CHART */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Breakdown Estimado</h4>
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius + 20;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            const textAnchor = x > cx ? 'start' : 'end';

                                            return (
                                                <text x={x} y={y} fill="#64748b" textAnchor={textAnchor} dominantBaseline="central" fontSize={11} className="dark:fill-slate-400">
                                                    {name}
                                                    <tspan x={x} dy="14" fontSize={10} fontWeight="bold">
                                                        $ {Math.round(value).toLocaleString('pt-BR')} MM ({(percent * 100).toFixed(0)}%)
                                                    </tspan>
                                                </text>
                                            );
                                        }}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => `$${val.toFixed(0)}M`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SUMMARY TABLE */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 overflow-auto">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Detalhamento (USD Milhões)</h4>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {chartData.map((item, idx) => (
                                        <tr key={idx} className="group">
                                            <td className="py-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">{item.name}</td>
                                            <td className="py-3 text-right font-medium text-slate-700 dark:text-slate-300">$ {Math.round(item.value).toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                        <td className="py-3 font-bold text-slate-900 dark:text-white">TOTAL</td>
                                        <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">$ {Math.round(currentTotal).toLocaleString('pt-BR')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PROBABILISTIC ANALYSIS SECTION (MONTE CARLO) */}
                    {mode === 'detailed' && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-indigo-200 dark:border-indigo-900/30 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                            <div className="relative z-10 mb-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Activity className="text-indigo-500 w-5 h-5" /> Análise Probabilística
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Parâmetros de entrada para Simulação de Monte Carlo (Comparativo de VPL)
                                </p>
                            </div>

                            {/* Monte Carlo Simulation Button and Results */}
                            <div className="relative z-10 mb-6">
                                <button
                                    onClick={runMonteCarlo}
                                    disabled={isSimulating}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSimulating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Rodando Simulação...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Rodar Simulação (2000 iterações)
                                        </>
                                    )}
                                </button>

                                {monteCarloResults && (
                                    <>
                                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {Object.entries(monteCarloResults).map(([category, data]) => (
                                                <div key={category} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-2">{category}</h5>
                                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                        <div>
                                                            <p className="text-slate-400">P10</p>
                                                            <p className="font-bold text-red-600 dark:text-red-400">$ {(data.p10 / 1000).toFixed(2)} B</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-slate-400">VPL Médio</p>
                                                            <p className="font-bold text-slate-700 dark:text-slate-300">$ {(data.mean / 1000).toFixed(2)} B</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-slate-400">P90</p>
                                                            <p className="font-bold text-emerald-600 dark:text-emerald-400">$ {(data.p90 / 1000).toFixed(2)} B</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 bg-white dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-4">
                                                Distribuição de Probabilidade do VPL
                                            </h5>
                                            <div className="space-y-4">
                                                {/* Convencional Distribution */}
                                                {monteCarloResults['Convencional']?.histogram && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                                            Convencional
                                                        </p>
                                                        <div className="h-40">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={monteCarloResults['Convencional'].histogram} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                                                                    <defs>
                                                                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.8} />
                                                                            <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                                                    <XAxis dataKey="value" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v / 1000).toFixed(1)} />
                                                                    <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                                                    <Tooltip
                                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '9px' }}
                                                                        formatter={(value) => [`${value} iterações`, 'Frequência']}
                                                                        labelFormatter={(label) => `VPL: $${(label / 1000).toFixed(2)}B`}
                                                                    />
                                                                    <ReferenceLine x={monteCarloResults['Convencional'].p10} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P10', position: 'top', fontSize: 8, fill: '#ef4444' }} />
                                                                    <ReferenceLine x={monteCarloResults['Convencional'].p50} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P50', position: 'top', fontSize: 8, fill: '#f59e0b' }} />
                                                                    <ReferenceLine x={monteCarloResults['Convencional'].p90} stroke="#10b981" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P90', position: 'top', fontSize: 8, fill: '#10b981' }} />
                                                                    <Area type="monotone" dataKey="frequency" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                                                            <div className="bg-red-50 dark:bg-red-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-red-600 dark:text-red-400 font-medium">P10</p>
                                                                <p className="text-[9px] font-bold text-red-700 dark:text-red-300">${(monteCarloResults['Convencional'].p10 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-amber-600 dark:text-amber-400 font-medium">P50</p>
                                                                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300">${(monteCarloResults['Convencional'].p50 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium">P90</p>
                                                                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">${(monteCarloResults['Convencional'].p90 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Inteligente Hidráulica Distribution */}
                                                {monteCarloResults['Inteligente Hidráulica']?.histogram && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                            Inteligente Hidráulica
                                                        </p>
                                                        <div className="h-40">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={monteCarloResults['Inteligente Hidráulica'].histogram} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                                                                    <defs>
                                                                        <linearGradient id="colorHid" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                                                    <XAxis dataKey="value" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v / 1000).toFixed(1)} />
                                                                    <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                                                    <Tooltip
                                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '9px' }}
                                                                        formatter={(value) => [`${value} iterações`, 'Frequência']}
                                                                        labelFormatter={(label) => `VPL: $${(label / 1000).toFixed(2)}B`}
                                                                    />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Hidráulica'].p10} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P10', position: 'top', fontSize: 8, fill: '#ef4444' }} />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Hidráulica'].p50} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P50', position: 'top', fontSize: 8, fill: '#f59e0b' }} />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Hidráulica'].p90} stroke="#10b981" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P90', position: 'top', fontSize: 8, fill: '#10b981' }} />
                                                                    <Area type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHid)" />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                                                            <div className="bg-red-50 dark:bg-red-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-red-600 dark:text-red-400 font-medium">P10</p>
                                                                <p className="text-[9px] font-bold text-red-700 dark:text-red-300">${(monteCarloResults['Inteligente Hidráulica'].p10 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-amber-600 dark:text-amber-400 font-medium">P50</p>
                                                                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300">${(monteCarloResults['Inteligente Hidráulica'].p50 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium">P90</p>
                                                                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">${(monteCarloResults['Inteligente Hidráulica'].p90 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Inteligente Elétrica Distribution */}
                                                {monteCarloResults['Inteligente Elétrica']?.histogram && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                            Inteligente Elétrica
                                                        </p>
                                                        <div className="h-40">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={monteCarloResults['Inteligente Elétrica'].histogram} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                                                                    <defs>
                                                                        <linearGradient id="colorEle" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                                                    <XAxis dataKey="value" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v / 1000).toFixed(1)} />
                                                                    <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                                                    <Tooltip
                                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '9px' }}
                                                                        formatter={(value) => [`${value} iterações`, 'Frequência']}
                                                                        labelFormatter={(label) => `VPL: $${(label / 1000).toFixed(2)}B`}
                                                                    />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Elétrica'].p10} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P10', position: 'top', fontSize: 8, fill: '#ef4444' }} />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Elétrica'].p50} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P50', position: 'top', fontSize: 8, fill: '#f59e0b' }} />
                                                                    <ReferenceLine x={monteCarloResults['Inteligente Elétrica'].p90} stroke="#10b981" strokeWidth={1.5} strokeDasharray="2 3" label={{ value: 'P90', position: 'top', fontSize: 8, fill: '#10b981' }} />
                                                                    <Area type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEle)" />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                                                            <div className="bg-red-50 dark:bg-red-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-red-600 dark:text-red-400 font-medium">P10</p>
                                                                <p className="text-[9px] font-bold text-red-700 dark:text-red-300">${(monteCarloResults['Inteligente Elétrica'].p10 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-amber-600 dark:text-amber-400 font-medium">P50</p>
                                                                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-300">${(monteCarloResults['Inteligente Elétrica'].p50 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-1 py-0.5">
                                                                <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium">P90</p>
                                                                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">${(monteCarloResults['Inteligente Elétrica'].p90 / 1000).toFixed(2)}B</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-3 text-center">
                                                Histograma baseado em 2000 iterações por categoria | Eixo X: VPL em Bilhões ($B)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* CATEGORY 1: CONVENTIONAL */}
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">1. Convencional (Benchmark)</h4>
                                        </div>
                                        <span className="text-[10px] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                                            Robusto & Barato
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900/50">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Capex Multiplier</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">1.0 (Base)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Falha (Lambda)</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">0.15</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Taxa Sonda (Mult)</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">1.0</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Tempo Espera (d)</p>
                                                <p className="font-mono font-bold text-orange-600 dark:text-orange-400">Triang(90, 120, 180)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Declínio Global</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Normal(0.12, 0.02)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Fator Hiperbólico</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.1, 0.3, 0.4)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Breakthrough (anos)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(3, 5, 6)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Cresc. Água (k)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.8, 1.2, 1.5)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CATEGORY 2: INTELLIGENT HYDRAULIC */}
                                <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg overflow-hidden">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-b border-blue-200 dark:border-blue-900/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">2. Inteligente Hidráulica</h4>
                                        </div>
                                        <span className="text-[10px] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                                            Controle Zonal
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900/50">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Capex Multiplier</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">Triang(1.05, 1.10, 1.20)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Falha (Lambda)</p>
                                                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">0.05</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Taxa Sonda (Mult)</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">1.0</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Tempo Espera (d)</p>
                                                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">0 (Remoto)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Declínio Global</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Normal(0.09, 0.015)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Fator Hiperbólico</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.3, 0.5, 0.6)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Breakthrough (anos)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(5, 7, 9)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Cresc. Água (k)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.5, 0.7, 0.9)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CATEGORY 3: INTELLIGENT ELECTRIC */}
                                <div className="border border-purple-200 dark:border-purple-900/50 rounded-lg overflow-hidden">
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 border-b border-purple-200 dark:border-purple-900/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">3. Inteligente Elétrica</h4>
                                        </div>
                                        <span className="text-[10px] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400">
                                            Digital & Real-time
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900/50">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Capex Multiplier</p>
                                                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">Triang(1.01, 1.15, 1.25)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Falha (Lambda)</p>
                                                <p className="font-mono font-bold text-purple-600 dark:text-purple-400">0.04</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Taxa Sonda (Mult)</p>
                                                <p className="font-mono font-bold text-red-600 dark:text-red-400">1.2 (Sonda Espec.)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Tempo Espera (d)</p>
                                                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">0 (Remoto)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Declínio Global</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Normal(0.06, 0.01)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Fator Hiperbólico</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.6, 0.7, 0.9)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Breakthrough (anos)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(7, 9, 12)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-0.5">Cresc. Água (k)</p>
                                                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Triang(0.3, 0.4, 0.6)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                    }

                </div >

                {/* DISCLAIMER FOOTER */}
                < div className="col-span-1 lg:col-span-12 mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3" >
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h5 className="font-bold mb-1">Nota Metodológica e Fontes:</h5>
                        <p className="opacity-90 leading-relaxed">
                            As premissas de custo e prazo baseiam-se em benchmarks de mercado (Market Intelligence) de fontes como ANP, Relatórios de Brokers Marítimos (ex: Clarksons/Fearnleys) e dados públicos de Planos Estratégicos de Operadoras (2024-2026), ajustados para o cenário de alta demanda de sondas (Upcycle) previsto para o período.
                        </p>
                    </div>
                </div >
            </div >
        </div >
    );
}
