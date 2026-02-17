
import React, { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Settings, RefreshCw, AlertCircle, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import { runProductionMonteCarlo } from '../utils/monteCarloProduction';
import { formatCurrency, formatBillions } from '../utils/calculations';

const ParameterInput = ({ label, setting, onChange, unit, step = 1 }) => {
    if (!setting.active) return null;

    return (
        <div className="grid grid-cols-3 gap-2 mt-2 animate-in slide-in-from-top-1">
            <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold">Mínimo</label>
                <input
                    type="number"
                    value={setting.min}
                    onChange={(e) => onChange({ ...setting, min: Number(e.target.value) })}
                    step={step}
                    className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                />
            </div>
            <div>
                <label className="text-[10px] text-emerald-600 uppercase font-bold">Moda (Base)</label>
                <input
                    type="number"
                    value={setting.mode}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                />
            </div>
            <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold">Máximo</label>
                <input
                    type="number"
                    value={setting.max}
                    onChange={(e) => onChange({ ...setting, max: Number(e.target.value) })}
                    step={step}
                    className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                />
            </div>
        </div>
    );
};

export default function ProductionMonteCarlo({ baseParams, results, setResults }) {
    const [isRunning, setIsRunning] = useState(false);
    // results and setResults are now props
    const [isConfigOpen, setIsConfigOpen] = useState(!results); // Auto-open if no results

    const r1 = (v) => Math.round(v * 10) / 10;

    const [settings, setSettings] = useState({
        peakProduction: {
            active: true,
            min: Math.round((baseParams.peakProduction || 100) * 0.8),
            mode: baseParams.peakProduction || 100,
            max: Math.round((baseParams.peakProduction || 100) * 1.2)
        },
        plateauDuration: {
            active: true,
            min: Math.max(1, (baseParams.plateauDuration || 4) - 2),
            mode: baseParams.plateauDuration || 4,
            max: (baseParams.plateauDuration || 4) + 2
        },
        declineRate: {
            active: true,
            min: r1(Math.max(1, (baseParams.declineRate || 10) * 0.7)),
            mode: baseParams.declineRate || 10,
            max: r1((baseParams.declineRate || 10) * 1.3)
        },
        // BSW Parameters (Detailed Mode Only)
        bswBreakthrough: {
            active: true,
            min: r1(Math.max(1, (baseParams.bswBreakthrough || 5) * 0.8)),
            mode: baseParams.bswBreakthrough || 5,
            max: r1((baseParams.bswBreakthrough || 5) * 1.2)
        },
        bswGrowthRate: {
            active: true,
            min: r1(Math.max(0.1, (baseParams.bswGrowthRate || 1.2) * 0.8)),
            mode: baseParams.bswGrowthRate || 1.2,
            max: r1((baseParams.bswGrowthRate || 1.2) * 1.2)
        }
    });

    // Update Mode and Ranges when base params change
    useEffect(() => {
        setSettings(prev => ({
            peakProduction: {
                ...prev.peakProduction,
                mode: baseParams.peakProduction || 100,
                min: Math.round((baseParams.peakProduction || 100) * 0.8),
                max: Math.round((baseParams.peakProduction || 100) * 1.2)
            },
            plateauDuration: {
                ...prev.plateauDuration,
                mode: baseParams.plateauDuration || 4,
                min: Math.max(1, (baseParams.plateauDuration || 4) - 2),
                max: (baseParams.plateauDuration || 4) + 2
            },
            declineRate: {
                ...prev.declineRate,
                mode: baseParams.declineRate || 10,
                min: r1(Math.max(1, (baseParams.declineRate || 10) * 0.7)),
                max: r1((baseParams.declineRate || 10) * 1.3)
            },
            bswBreakthrough: {
                ...prev.bswBreakthrough,
                mode: baseParams.bswBreakthrough || 5,
                min: r1(Math.max(1, (baseParams.bswBreakthrough || 5) * 0.8)),
                max: r1((baseParams.bswBreakthrough || 5) * 1.2)
            },
            bswGrowthRate: {
                ...prev.bswGrowthRate,
                mode: baseParams.bswGrowthRate || 1.2,
                min: r1(Math.max(0.1, (baseParams.bswGrowthRate || 1.2) * 0.8)),
                max: r1((baseParams.bswGrowthRate || 1.2) * 1.2)
            }
        }));
    }, [
        baseParams.peakProduction,
        baseParams.plateauDuration,
        baseParams.declineRate,
        baseParams.bswBreakthrough,
        baseParams.bswGrowthRate
    ]);

    const handleRunSimulation = () => {
        setIsRunning(true);
        // Small timeout to allow UI to render spinner
        setTimeout(() => {
            const simResults = runProductionMonteCarlo(baseParams, settings, 2000);
            setResults(simResults);
            setIsRunning(false);
            setIsConfigOpen(false); // Auto collapse config on run
        }, 100);
    };

    const toggleSetting = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], active: !prev[key].active }
        }));
    };

    const updateSetting = (key, newValues) => {
        setSettings(prev => ({
            ...prev,
            [key]: newValues
        }));
    };

    // Custom Tooltip for better styling and contrast
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Filter out hidden series
            const items = payload.filter(p => p.name !== 'delta' && p.name !== 'base_stack' && p.name !== 'Hide' && p.name !== 'base_stack');

            // Sort: P10 (High) -> P50 -> P90 (Low)
            items.sort((a, b) => {
                if (a.name.includes('P10')) return -1;
                if (a.name.includes('P90')) return 1;
                return 0;
            });

            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg outline-none">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Ano {label}</p>
                    <div className="space-y-1">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between gap-4 text-xs">
                                <span className="" style={{ color: item.color }}>{item.name}:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {Number(item.value).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                        <BarChart2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Simulação probabilística (Monte Carlo)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Analise riscos e incertezas da curva de produção</p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {/* Configuration Section */}
                <div className="mb-6 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Settings size={16} /> Parâmetros de Incerteza (Distribuição Triangular)
                        </span>
                        {isConfigOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {isConfigOpen && (
                        <div className="p-4 space-y-4">
                            {/* Peak Production */}
                            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.peakProduction.active}
                                        onChange={() => toggleSetting('peakProduction')}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pico de Produção (kbpd)</span>
                                </div>
                                <ParameterInput
                                    setting={settings.peakProduction}
                                    onChange={(val) => updateSetting('peakProduction', val)}
                                />
                            </div>

                            {/* Plateau Duration */}
                            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.plateauDuration.active}
                                        onChange={() => toggleSetting('plateauDuration')}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Duração do Platô (anos)</span>
                                </div>
                                <ParameterInput
                                    setting={settings.plateauDuration}
                                    onChange={(val) => updateSetting('plateauDuration', val)}
                                />
                            </div>

                            {/* Decline Rate */}
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.declineRate.active}
                                        onChange={() => toggleSetting('declineRate')}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Taxa de Declínio (%)</span>
                                </div>
                                <ParameterInput
                                    setting={settings.declineRate}
                                    onChange={(val) => updateSetting('declineRate', val)}
                                    step={0.1}
                                />
                            </div>

                            {/* BSW Parameters (Detailed Only) */}
                            {baseParams.productionMode === 'detailed' && (
                                <>
                                    {/* BSW Breakthrough */}
                                    <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={settings.bswBreakthrough.active}
                                                onChange={() => toggleSetting('bswBreakthrough')}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ano de Breakthrough (BSW)</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2 pl-7">Ano em que a produção de água acelera.</p>
                                        <ParameterInput
                                            setting={settings.bswBreakthrough}
                                            onChange={(val) => updateSetting('bswBreakthrough', val)}
                                            step={0.1}
                                        />
                                    </div>

                                    {/* BSW Growth */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={settings.bswGrowthRate.active}
                                                onChange={() => toggleSetting('bswGrowthRate')}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Velocidade Crescimento BSW (k)</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2 pl-7">Fator k da curva sigmoide do BSW.</p>
                                        <ParameterInput
                                            setting={settings.bswGrowthRate}
                                            onChange={(val) => updateSetting('bswGrowthRate', val)}
                                            step={0.01}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleRunSimulation}
                                    disabled={isRunning}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isRunning ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                                    {isRunning ? 'Executando Simulação...' : 'Rodar Simulação (2000 Iterações)'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {results && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* Reserves (Volume) Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">P90 (Vol Conservador)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{results.reserves.p90.toFixed(0)}</span>
                                    <span className="text-xs text-slate-400">MMbbl</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full pointer-events-none group-hover:bg-red-500/20 transition-colors"></div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">P50 (Vol Base)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{results.reserves.p50.toFixed(0)}</span>
                                    <span className="text-xs text-slate-400">MMbbl</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">P10 (Vol Otimista)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.reserves.p10.toFixed(0)}</span>
                                    <span className="text-xs text-slate-400">MMbbl</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
                            </div>
                        </div>

                        {/* VPL (Financial) Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">VPL P90 (Conservador)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{formatBillions(results.vpl.p90)}</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">VPL P50 (Base)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">{formatBillions(results.vpl.p50)}</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-bl-full pointer-events-none group-hover:bg-violet-500/20 transition-colors"></div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] whitespace-nowrap text-slate-500 uppercase tracking-wider font-bold mb-1">VPL P10 (Otimista)</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{formatBillions(results.vpl.p10)}</span>
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors"></div>
                            </div>
                        </div>

                        <div className="h-[400px] bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Curvas Probabilísticas de Produção</h4>
                            <ResponsiveContainer width="100%" height="90%">
                                <ComposedChart
                                    data={results.chartData.map(d => {
                                        const factor = 1000 / 365;
                                        const p10 = d.p10 * factor;
                                        const p90 = d.p90 * factor;
                                        return {
                                            ...d,
                                            p10,
                                            p50: d.p50 * factor,
                                            p90,
                                            delta: p10 - p90
                                        };
                                    })}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        label={{ value: 'Ano', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        label={{ value: 'Produção (kbpd)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

                                    {/* Invisible Area to push the stack up to P90 level */}
                                    <Area
                                        type="monotone"
                                        dataKey="p90"
                                        stackId="band"
                                        stroke="none"
                                        fill="transparent"
                                        legendType="none"
                                        name="base_stack"
                                        isAnimationActive={false}
                                        tooltipType="none"
                                    />
                                    {/* Visible Band (P10 - P90) */}
                                    <Area
                                        type="monotone"
                                        dataKey="delta"
                                        stackId="band"
                                        stroke="none"
                                        fill="url(#colorBand)"
                                        name="Incerteza (P90-P10)"
                                        isAnimationActive={true}
                                    />

                                    {/* Explict Lines for P10, P50, P90 */}
                                    <Line type="monotone" dataKey="p10" stroke="#10b981" strokeWidth={2} name="P10 (Otimista)" dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="p50" stroke="#6366f1" strokeWidth={3} name="P50 (Base)" dot={false} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="p90" stroke="#ef4444" strokeWidth={2} name="P90 (Conservador)" dot={false} activeDot={{ r: 4 }} />

                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 flex gap-2 items-start">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>
                                O <strong>P90</strong> representa um cenário conservador (90% de chance da produção real superar esta curva).
                                O <strong>P10</strong> representa o potencial de upside (apenas 10% de chance de superar).
                                A simulação utiliza o método de Monte Carlo com Distribuição Triangular para os parâmetros selecionados.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
