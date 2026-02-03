import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { AlertTriangle, Info, Play, RefreshCw, Settings, TrendingUp } from 'lucide-react';
import { generateProjectData, formatMillionsNoDecimals } from '../../utils/calculations';

export default function TornadoChart({ projectParams }) {
    const [results, setResults] = useState([]);
    const [baseVPL, setBaseVPL] = useState(0);
    const [error, setError] = useState(null);

    // 1. Define Base Case - FLATTEN ALL NESTED PARAMS IMMEDIATELY
    const baseParams = useMemo(() => {
        const defaults = {
            // General
            totalCapex: 5000, // $ MM
            capexDuration: 5,
            capexConcentration: 20, // %
            capexPeakRelative: 1,

            // Critical Objects Required by generateProjectData
            capexSplit: { platform: 40, wells: 40, subsea: 20 },
            depreciationMode: 'simple',
            depreciationYears: 10,

            brentPrice: 75, // $/bbl
            brentStrategy: 'constant',

            // Production
            peakProduction: 150, // kbpd
            rampUpDuration: 4,
            plateauDuration: 5,
            declineRate: 10, // %
            projectDuration: 30,
            totalReserves: 800, // MMbbl
            oilAPI: 30,

            // OPEX
            opexMode: 'simple',
            opexMargin: 30, // % of revenue
            opexFixed: 100,
            opexVariable: 5,
            workoverLambda: 0.15,

            // Fiscal
            taxRegime: 'concession',
            royaltiesRate: 10,
            specialParticipationRate: 0,
            profitOilGovShare: 0,
            corporateTaxRate: 34,
            discountRate: 10, // % TMA
            inflationRate: 2,

            // Repetro Defaults
            repetroRatio: { platform: 100, wells: 100, subsea: 100 },
            platformOwnership: 'owned',

            // Wells defaults
            rigRate: 490,
            workoverDailyRate: 800,
            drillingDays: 90,
            completionDays: 35,
            connectionDays: 15,
            numWells: 16,

            // Production details
            bswBreakthrough: 7,
            bswGrowthRate: 0.7,
            hyperbolicFactor: 0.5,
            workoverTesp: 60
        };

        // Flatten everything into a single object
        const flattened = {
            ...defaults,
            ...(projectParams || {}),
            ...(projectParams?.wellsParams || {}),
            ...(projectParams?.productionParams || {}),
            ...(projectParams?.opexParams || {}),
            ...(projectParams?.taxParams || {})
        };

        return flattened;
    }, [projectParams]);

    // 2. Run Sensitivity Analysis (One-at-a-Time)
    useEffect(() => {
        try {
            const runSimulation = () => {
                setError(null);

                // --- HELPER: Base Param Preparation ---
                // We need to ensure we have the drilling-specific defaults if they aren't in projectParams
                const defaults = {
                    // Defaults from WellsCapex low/high logic could be used here if needed
                    // But we assume projectParams has the current snapshot
                    rigRate: 490, // $k/day
                    workoverDailyRate: 800, // $k/day
                    drillingDays: 90,
                    completionDays: 35,
                    connectionDays: 15,
                    numWells: 16
                };

                // getParam now simply reads from flattened baseParams
                const getParam = (key, fallback) => {
                    return baseParams[key] !== undefined ? baseParams[key] : fallback;
                };

                // Calculate Base Case
                // Note: projectParams is already "Live", so we just run it.
                // However, we need to ensure units are correct for engine (Abs $)
                // AND we must ensure 'detailed' modes are active for BSW/Workover logic to work.
                const prepareEngineParams = (p) => {
                    const scaleIfNeeded = (val) => (val < 1_000_000 ? val * 1_000_000 : val);

                    // p is already flattened when passed in, just scale monetary values
                    return {
                        ...p,
                        totalCapex: scaleIfNeeded(p.totalCapex || defaults.totalCapex),
                        opexFixed: scaleIfNeeded(p.opexFixed || defaults.opexFixed),
                        // FORCE DETAILED MODES for Sensitivity to work on these specific params
                        productionMode: 'detailed',
                        opexMode: 'detailed'
                    };
                };

                // Generate Base Run
                // Ensure we handle potential errors in base run
                let vplBaseMM = 0;
                try {
                    const baseRun = generateProjectData(prepareEngineParams(baseParams));
                    vplBaseMM = baseRun.metrics.vpl / 1_000_000;
                    setBaseVPL(vplBaseMM);
                } catch (e) {
                    console.warn("Base run failed:", e);
                    setBaseVPL(0);
                    // Continue to sensitivity? No, pointless.
                    return;
                }

                // --- CONSTANTS FOR SENSITIVITY ---
                const WELLS_SHARE_OF_TOTAL = 0.40; // Assumption: Wells are ~40% of project capex
                const MATERIALS_SHARE_IN_WELLS = 0.30; // Assumption: Materials are ~30% of well cost
                const RIG_SHARE_IN_WELLS = 0.70; // Assumption: Rig/Services are ~70% of well cost

                // --- DEFINE VARIABLES ---
                const sensitivityVars = [
                    {
                        id: 'capexMult',
                        label: 'Multiplicador CAPEX (Materiais)',
                        isMultiplier: true,
                        apply: (p, val) => {
                            // Logic: Change affects only Materials share of Wells Capex
                            // Range is 1.0 to 1.35. Base assumed 1.0.
                            const baseWellsMatCost = p.totalCapex * WELLS_SHARE_OF_TOTAL * MATERIALS_SHARE_IN_WELLS;
                            const delta = baseWellsMatCost * (val - 1.0);
                            return { ...p, totalCapex: p.totalCapex + delta };
                        }
                    },
                    {
                        id: 'workoverLambda',
                        label: 'Falha (Lambda)',
                        apply: (p, val) => ({ ...p, workoverLambda: val })
                    },
                    {
                        id: 'rigRate',
                        label: 'Taxa Sonda (Multiplier)',
                        isMultiplier: true,
                        apply: (p, val) => {
                            // Val is a MULTIPLIER (e.g. 1.0 to 1.2)
                            const baseWellsRigCost = p.totalCapex * WELLS_SHARE_OF_TOTAL * RIG_SHARE_IN_WELLS;
                            const deltaCapex = baseWellsRigCost * (val - 1.0);

                            const baseDailyRate = getParam('workoverDailyRate', 800);

                            return {
                                ...p,
                                workoverDailyRate: baseDailyRate * val,
                                totalCapex: p.totalCapex + deltaCapex
                            };
                        }
                    },
                    {
                        id: 'workoverTesp',
                        label: 'Tempo Espera',
                        apply: (p, val) => ({ ...p, workoverTesp: val })
                    },
                    {
                        id: 'declineRate',
                        label: 'Declínio Global',
                        apply: (p, val) => ({ ...p, declineRate: val })
                    },
                    {
                        id: 'hyperbolicFactor',
                        label: 'Fator Hiperbólico',
                        apply: (p, val) => ({ ...p, hyperbolicFactor: val })
                    },
                    {
                        id: 'bswBreakthrough',
                        label: 'Breakthrough (BSW)',
                        apply: (p, val) => ({ ...p, bswBreakthrough: val })
                    },
                    {
                        id: 'bswGrowthRate',
                        label: 'Crescimento Água (K)',
                        apply: (p, val) => ({ ...p, bswGrowthRate: val })
                    }
                ];

                const sensitivityData = sensitivityVars.map(variable => {
                    let lowVal, highVal;

                    if (variable.isMultiplier) {
                        lowVal = 0.9;
                        highVal = 1.1;
                    } else {
                        // Get Base Value
                        // Use 0 as safe fallback to avoid NaN
                        const baseVal = getParam(variable.id, 0);
                        lowVal = baseVal * 0.9;
                        highVal = baseVal * 1.1;
                    }

                    // Low Scenario (Min)
                    const lowParams = variable.apply({ ...baseParams }, lowVal);
                    const lowRun = generateProjectData(prepareEngineParams(lowParams));
                    const vplLow = lowRun.metrics.vpl / 1_000_000;

                    // High Scenario (Max)
                    const highParams = variable.apply({ ...baseParams }, highVal);
                    const highRun = generateProjectData(prepareEngineParams(highParams));
                    const vplHigh = highRun.metrics.vpl / 1_000_000;

                    const minVPL = Math.min(vplLow, vplHigh);
                    const maxVPL = Math.max(vplLow, vplHigh);

                    return {
                        name: variable.label,
                        parameter: variable.id,
                        base: vplBaseMM,
                        low: vplLow,
                        high: vplHigh,
                        min: minVPL,
                        max: maxVPL,
                        swing: maxVPL - minVPL,
                        isPositiveCorrelation: (vplHigh > vplLow)
                    };
                });

                // Sort by Swing Descending
                sensitivityData.sort((a, b) => b.swing - a.swing);

                setResults(sensitivityData);
            };

            runSimulation();
        } catch (err) {
            console.error("Tornado Chart Error:", err);
            setError(err.message + ". Check console for details.");
        }
    }, [baseParams]);

    // Formatters for Tooltip
    const toMoney = (val) => `$${Math.round(val).toLocaleString()} MM`;

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-800 border border-red-200 rounded-xl">
                <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Erro na Simulação Tornado</h3>
                <p className="mt-2 text-sm font-mono">{error}</p>
                <p className="mt-4 text-xs">Verifique os parâmetros passados para generateProjectData.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[600px] animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Análise de Sensibilidade (Tornado)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Impacto no VPL (Net Present Value) variando parâmetros-chave em <span className="font-bold text-slate-700 dark:text-slate-300">cenários Min/Max</span>.
                    </p>
                </div>
                <div className="text-right bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold text-center">VPL (Base)</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{toMoney(baseVPL)}</p>
                </div>
            </div>

            {/* CHART CONTAINER */}
            <div className="h-[500px] w-full mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={results}
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        barGap={0}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} opacity={0.2} stroke="#94a3b8" />
                        <XAxis
                            type="number"
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                            label={{ value: 'VPL ($ MM)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={140}
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
                                            <p className="font-bold mb-2 text-emerald-400 border-b border-slate-600 pb-1">{data.name}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                <span className="text-slate-400">Low:</span>
                                                <span className="font-mono text-right">{toMoney(data.low)}</span>

                                                <span className="text-slate-400">Base:</span>
                                                <span className="font-mono text-right text-blue-300">{toMoney(data.base)}</span>

                                                <span className="text-slate-400">High:</span>
                                                <span className="font-mono text-right">{toMoney(data.high)}</span>

                                                <span className="text-slate-400 mt-1 pt-1 border-t border-slate-600">Swing:</span>
                                                <span className="font-mono text-right mt-1 pt-1 border-t border-slate-600 text-amber-400 font-bold">{toMoney(data.swing)}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ReferenceLine x={baseVPL} stroke="#3b82f6" strokeDasharray="3 3" />

                        {/* Bars for Range */}
                        {/* We use specific bars to show the range relative to base */}
                        {/* Since Recharts doesn't strictly do "Floating Bars" easily without custom shapes or stacked hacks, 
                            we will use a simplified approach: Two bars, one transparent (to offset) and one visible? 
                            No, standard approach for Tornado is:
                            Bar from Min to Max? No, Bar from Base to Low and Bar from Base to High.
                        */}
                        <Bar dataKey="min" fill="transparent" stackId="a" />
                        {/* Actually, for Tornado it's better to render custom shapes or just use the min-max range if supported. 
                            Recharts can take [min, max] data? Not directly for Bar.
                            Workaround: Range Bar Chart.
                            We construct data so that we have a 'start' which is min(low, high) and 'length' = abs(high-low).
                            But we want to color differently left/right of base?
                            
                            Simplification: Use the pre-calculated 'min' and 'max' and draw a single bar from min to max?
                            Recharts <Bar dataKey="[min, max]" /> ? No.
                            
                            Let's use the standard "Range" trick:
                            Stack 1: Transparent bar up to 'min'
                            Stack 1: Visible bar of length 'swing'
                        */}
                        <Bar dataKey="min" stackId="a" fill="transparent" />
                        <Bar dataKey="swing" stackId="a" fill="#3b82f6" radius={[4, 4, 4, 4]} name="Range">
                            {
                                results.map((entry, index) => {
                                    // Optional: specific coloring
                                    return <Cell key={`cell-${index}`} fill={entry.isPositiveCorrelation ? '#10b981' : '#f59e0b'} fillOpacity={0.8} />;
                                })
                            }
                        </Bar>

                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
