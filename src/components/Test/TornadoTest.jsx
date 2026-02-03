import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { AlertTriangle, Info, Play, RefreshCw, Settings, TrendingUp } from 'lucide-react';
import { generateProjectData, formatMillionsNoDecimals } from '../../utils/calculations';

export default function TornadoTest({ projectParams }) {
    const [results, setResults] = useState([]);
    const [baseVPL, setBaseVPL] = useState(0);
    const [error, setError] = useState(null);

    // 1. Define Base Case
    // Use passed props if available, otherwise use defaults (for isolaton testing)
    const baseParams = useMemo(() => {
        if (projectParams) return projectParams;

        return {
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
            platformOwnership: 'owned'
        };
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

                const getParam = (key, fallback) => baseParams[key] !== undefined ? baseParams[key] : (baseParams.wellsParams?.[key] || fallback);

                // Calculate Base Case
                // Note: projectParams is already "Live", so we just run it.
                // However, we need to ensure units are correct for engine (Abs $)
                // AND we must ensure 'detailed' modes are active for BSW/Workover logic to work.
                const prepareEngineParams = (p) => {
                    const scaleIfNeeded = (val) => (val < 1_000_000 ? val * 1_000_000 : val);
                    return {
                        ...defaults, // Apply defaults first
                        ...p,        // Override with actual project params
                        totalCapex: scaleIfNeeded(p.totalCapex),
                        opexFixed: scaleIfNeeded(p.opexFixed),
                        // FORCE DETAILED MODES for Sensitivity to work on these specific params
                        productionMode: 'detailed',
                        opexMode: 'detailed'
                    };
                };

                const baseRun = generateProjectData(prepareEngineParams(baseParams));
                const vplBaseMM = baseRun.metrics.vpl / 1_000_000;
                setBaseVPL(vplBaseMM);

                // --- DEFINE VARIABLES ---
                // 1. Capex Multiplier
                // 2. Failure Rate (Lambda)
                // 3. Rig Rate (Taxa Sonda)
                // 4. Wait Time (Tempo Espera)
                // 5. Decline Rate
                // 6. Hyperbolic Factor
                // 7. Breakthrough
                // 8. Water Growth (K)

                // --- CONSTANTS FOR SENSITIVITY ---
                const WELLS_SHARE_OF_TOTAL = 0.40; // Assumption: Wells are ~40% of project capex
                const MATERIALS_SHARE_IN_WELLS = 0.30; // Assumption: Materials are ~30% of well cost
                const RIG_SHARE_IN_WELLS = 0.70; // Assumption: Rig/Services are ~70% of well cost

                // --- DEFINE VARIABLES ---
                const sensitivityVars = [
                    {
                        id: 'capexMult',
                        label: 'Multiplicador CAPEX (Materiais)',
                        min: 1.0,
                        max: 1.35,
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
                        min: 0.04,
                        max: 0.15,
                        apply: (p, val) => ({ ...p, workoverLambda: val })
                    },
                    {
                        id: 'rigRate',
                        label: 'Taxa Sonda (Multiplier)',
                        min: 1.0,
                        max: 1.2,
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
                        min: 0,
                        max: 120,
                        apply: (p, val) => ({ ...p, workoverTesp: val })
                    },
                    {
                        id: 'declineRate',
                        label: 'Declínio Global',
                        min: 7,
                        max: 10,
                        apply: (p, val) => ({ ...p, declineRate: val })
                    },
                    {
                        id: 'hyperbolicFactor',
                        label: 'Fator Hiperbólico',
                        min: 0.1,
                        max: 0.8,
                        apply: (p, val) => ({ ...p, hyperbolicFactor: val })
                    },
                    {
                        id: 'bswBreakthrough',
                        label: 'Breakthrough (BSW)',
                        min: 5,
                        max: 10,
                        apply: (p, val) => ({ ...p, bswBreakthrough: val })
                    },
                    {
                        id: 'bswGrowthRate',
                        label: 'Crescimento Água (K)',
                        min: 0.4,
                        max: 1.0,
                        apply: (p, val) => ({ ...p, bswGrowthRate: val })
                    }
                ];

                const sensitivityData = sensitivityVars.map(variable => {
                    // Low Scenario (Min)
                    const lowVal = variable.min;
                    const lowParams = variable.apply({ ...baseParams }, lowVal);

                    const lowRun = generateProjectData(prepareEngineParams(lowParams));
                    const vplLow = lowRun.metrics.vpl / 1_000_000;

                    // High Scenario (Max)
                    const highVal = variable.max;
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[600px]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                        Análise de Sensibilidade (Tornado)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Impacto no VPL (Net Present Value) variando parâmetros-chave em <span className="font-bold text-slate-700 dark:text-slate-300">+/- 20%</span>.
                    </p>
                </div>
                <div className="text-right bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold text-center">VPL (Cenário Base)</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{toMoney(baseVPL)}</p>
                </div>
            </div>

            {/* CHART CONTAINER */}
            <div className="h-[500px] w-full max-w-4xl mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={results}
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        barGap={0}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} opacity={0.2} />
                        <XAxis
                            type="number"
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                            label={{ value: 'VPL ($ MM)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={140}
                            tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                                            <p className="font-bold text-sm mb-2 border-b pb-1 dark:border-slate-600">{data.name}</p>
                                            <div className="space-y-1">
                                                <p className="flex justify-between gap-4"><span className="text-slate-500">Min VPL:</span> <span className="font-mono font-bold text-red-500">{toMoney(data.min)}</span></p>
                                                <p className="flex justify-between gap-4"><span className="text-slate-500">Base VPL:</span> <span className="font-mono font-bold text-blue-500">{toMoney(data.base)}</span></p>
                                                <p className="flex justify-between gap-4"><span className="text-slate-500">Max VPL:</span> <span className="font-mono font-bold text-emerald-500">{toMoney(data.max)}</span></p>
                                                <p className="flex justify-between gap-4 mt-2 pt-1 border-t dark:border-slate-600">
                                                    <span className="text-slate-500">Impacto Total:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{toMoney(data.swing)}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ReferenceLine x={baseVPL} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'top', value: 'Base', fill: '#3b82f6', fontSize: 10 }} />

                        {/* 
                            TRICK FOR TORNADO CHART:
                            Bar 1 (Invisible): Start from 0 to MinVPL (using transparent fill) - StackId="a"
                            Bar 2 (Visible Range): From MinVPL to MaxVPL (length = Max - Min) - StackId="a"
                         */}
                        <Bar dataKey="min" stackId="a" fill="transparent" barSize={20} />
                        <Bar dataKey="swing" stackId="a" barSize={20} radius={[4, 4, 4, 4]}>
                            {results.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isPositiveCorrelation ? '#10b981' : '#f43f5e'}
                                    fillOpacity={0.8}
                                />
                            ))}
                        </Bar>

                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                    <span>Correlação Negativa (Sobe parâm, desce VPL)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                    <span>Correlação Positiva (Sobe parâm, sobe VPL)</span>
                </div>
            </div>
            <div className="mt-2 text-center text-xs text-slate-400 italic">
                * Barras coloridas indicam a sensibilidade: Vermelho indica que aumentar este fator reduz o valor. Verde indica que aumentar este fator cria valor.
            </div>
        </div>
    );
}
