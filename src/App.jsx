import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ComposedChart, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import {
    Activity, LayoutTemplate, LineChart as ChartIcon, Landmark, Settings,
    Split, Table as TableIcon, Maximize, Minimize, Ship, TrendingUp
} from 'lucide-react';

import KPICard from './components/KPICard';
import ProjectInputForm from './components/ProjectInputForm';
import TaxParameters from './components/TaxParameters';
import ComparisonView from './components/ComparisonView';
import CashFlowTable from './components/CashFlowTable';
import { useProjectCalculations } from './hooks/useProjectCalculations';
import {
    formatCurrency, formatBillions, formatMillionsNoDecimals, calculatePeakFromReserves, getBrentCurve
} from './utils/calculations';

// --- Componente Principal ---

export default function App() {
    const [activeTab, setActiveTab] = useState('single');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCssFullScreen, setIsCssFullScreen] = useState(false);
    const containerRef = useRef(null);

    // Estados dos Projetos
    const defaultParams = {
        totalCapex: 6000000000,
        capexDuration: 5,
        capexPeakRelative: 0.9,
        capexConcentration: 5,

        // Contratação & Incentivos
        platformOwnership: 'owned',
        charterPV: 2000000000, // Default 2Bi para PV de afretamento
        charterSplitPercent: 85, // 85% Charter, 15% Service
        repetroRatio: { platform: 100, wells: 100, subsea: 100 }, // Detalhado por componente
        capexTaxRate: 40, // Alíquota cheia s/ benefício

        brentPrice: 70,
        brentSpread: 0,
        brentStrategy: 'constant',
        brentLongTerm: 60,
        brentPeakValue: 90,
        brentPeakYear: 5,

        peakProduction: 165,
        rampUpDuration: 3,
        plateauDuration: 4,
        declineRate: 8,
        opexMargin: 20,
        totalReserves: 1000,

        discountRate: 10,
        projectDuration: 30,
        depreciationYears: 10,

        taxRegime: 'sharing',
        royaltiesRate: 10,
        specialParticipationRate: 0,
        costOilCap: 50,
        profitOilGovShare: 30,
        corporateTaxRate: 34,
        govTake: 65,

        depreciationMode: 'detailed',
        capexSplit: { platform: 40, wells: 40, subsea: 20 },
        depreciationConfig: {
            platform: { method: 'accelerated', years: 5 },
            wells: { method: 'uop', years: 5 },
            subsea: { method: 'accelerated', years: 5 }
        }
    };

    const [projectA, setProjectA] = useState({ ...defaultParams });
    const [projectB, setProjectB] = useState({
        ...defaultParams,
        totalCapex: 7000000000,
        peakProduction: 180,
        plateauDuration: 4,
        platformOwnership: 'chartered',
        charterPV: 2500000000
    });

    // Cálculos
    const resultsA = useProjectCalculations(projectA);
    const resultsB = useProjectCalculations(projectB);

    const toggleFullScreen = async () => {
        // Check if we are currently in native fullscreen
        const isNativeFullScreen = !!document.fullscreenElement;

        if (!isNativeFullScreen && !isCssFullScreen) {
            // Try native first
            try {
                if (containerRef.current && containerRef.current.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                } else {
                    throw new Error("No native support");
                }
            } catch (err) {
                // Fallback to CSS
                setIsCssFullScreen(true);
            }
        } else {
            // Exit
            if (isNativeFullScreen) {
                if (document.exitFullscreen) await document.exitFullscreen();
            }
            if (isCssFullScreen) {
                setIsCssFullScreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Dados Brent Chart
    const brentChartData = useMemo(() => {
        const curve = getBrentCurve(projectA, projectA.projectDuration);
        return curve.map((price, idx) => ({ year: idx, price }));
    }, [projectA]);

    // Dados Curva de Produção Chart
    const productionChartData = useMemo(() => {
        return resultsA.yearlyData
            .filter(d => !d.isDecomYear && d.productionVolume > 0)
            .map(d => ({ year: d.year, volume: d.productionVolume }));
    }, [resultsA]);

    const handleChangeProjectA = (field, value) => {
        setProjectA(prev => ({ ...prev, [field]: value }));
    };

    const applyProductionProfile = (type) => {
        let updates = {};
        if (type === 'pre-salt') updates = { rampUpDuration: 3, plateauDuration: 4, declineRate: 8 };
        else if (type === 'post-salt') updates = { rampUpDuration: 4, plateauDuration: 2, declineRate: 12 };
        else if (type === 'onshore') updates = { rampUpDuration: 1, plateauDuration: 6, declineRate: 6 };

        setProjectA(prev => {
            const next = { ...prev, ...updates };
            const newPeak = calculatePeakFromReserves(next.totalReserves, next.rampUpDuration, next.plateauDuration, next.declineRate, next.projectDuration);
            return { ...next, peakProduction: Math.round(newPeak) };
        });
    };
    const applyReservesToPeak = () => {
        const newPeak = calculatePeakFromReserves(
            projectA.totalReserves,
            projectA.rampUpDuration,
            projectA.plateauDuration,
            projectA.declineRate,
            projectA.projectDuration
        );
        if (newPeak > 0 && isFinite(newPeak)) {
            setProjectA(prev => ({ ...prev, peakProduction: Math.round(newPeak) }));
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Pega os dados completos do primeiro item (todos compartilham o mesmo payload[0].payload)
            const data = payload[0].payload;

            return (
                <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-700 mb-2">Ano {label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Receita:</span>
                            <span className="font-medium text-emerald-600">{formatMillionsNoDecimals(data.revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">OPEX:</span>
                            <span className="font-medium text-red-500">{formatMillionsNoDecimals(Math.abs(data.opex))}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Depreciação:</span>
                            <span className="font-medium text-slate-600">{formatMillionsNoDecimals(Math.abs(data.depreciation))}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Impostos:</span>
                            <span className="font-medium text-purple-600">{formatMillionsNoDecimals(Math.abs(data.taxes))}</span>
                        </div>
                        <div className="my-1 border-t border-slate-100 pt-1">
                            <div className="flex justify-between gap-4 font-bold">
                                <span className="text-blue-600">FCL:</span>
                                <span>{formatMillionsNoDecimals(data.freeCashFlow)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-emerald-500">
                                <span>Acumulado:</span>
                                <span>{formatMillionsNoDecimals(data.accumulatedCashFlow)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div ref={containerRef} className={`min-h-screen bg-slate-50 text-slate-800 font-sans overflow-auto ${isCssFullScreen ? 'fixed inset-0 z-[9999]' : ''}`}>

            {/* Navbar / Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6 lg:py-4 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-white shadow-lg shadow-blue-200 shrink-0">
                        <Activity size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 truncate">Simulador E&P</h1>
                        <p className="text-xs text-slate-500 hidden sm:block">Análise Econômica de Projetos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto overflow-hidden">
                    <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto w-full lg:w-auto no-scrollbar mask-gradient-right">
                        {['single', 'production', 'brent', 'tax', 'compare', 'cashflow_table'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                {tab === 'single' && <LayoutTemplate size={16} />}
                                {tab === 'production' && <Settings size={16} />}
                                {tab === 'brent' && <ChartIcon size={16} />}
                                {tab === 'tax' && <Landmark size={16} />}
                                {tab === 'compare' && <Split size={16} />}
                                {tab === 'cashflow_table' && <TableIcon size={16} />}
                                <span className="capitalize">{tab === 'single' ? 'Dashboard' : tab === 'production' ? 'Produção' : tab === 'tax' ? 'Fiscal' : tab === 'compare' ? 'Comparar' : tab === 'brent' ? 'Brent' : 'Tabela'}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={toggleFullScreen}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                        title="Tela Inteira"
                    >
                        {isFullScreen || isCssFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">


                {/* --- PERSISTENT HEADER: Economic Indicators --- */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KPICard title="VPL (NPV)" value={formatBillions(resultsA.metrics.vpl)} type={resultsA.metrics.vpl > 0 ? 'positive' : 'negative'} subtext="Valor Presente Líquido" />
                    <KPICard title="TIR (IRR)" value={resultsA.metrics.tir ? `${resultsA.metrics.tir.toFixed(2)}%` : 'N/A'} type="blue" subtext={`Hurdle: ${projectA.discountRate}%`} />
                    <KPICard title="TIR - TMA" value={resultsA.metrics.spread ? `${resultsA.metrics.spread.toFixed(2)}%` : '-'} type={resultsA.metrics.spread > 0 ? 'positive' : 'negative'} subtext="Spread de Retorno" />
                    <KPICard title="VPL / IA" value={resultsA.metrics.vpl_ia.toFixed(2) + 'x'} type={resultsA.metrics.vpl_ia > 0 ? 'purple' : 'neutral'} subtext="Eficiência do Investimento" />
                    <KPICard title="Payback" value={resultsA.metrics.payback ? `${resultsA.metrics.payback.toFixed(1)} anos` : '> Dur.'} type="neutral" subtext="Descontado" />
                    <KPICard title="Brent Equilíbrio" value={resultsA.metrics.breakevenBrent ? `$${resultsA.metrics.breakevenBrent.toFixed(2)}` : 'N/A'} type="neutral" subtext="Preço para VPL = 0" tooltip="Preço constante do Brent necessário para zerar o VPL do projeto (Breakeven Price)." />
                </div>

                {/* --- VIEW: SINGLE --- */}
                {activeTab === 'single' && (
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                        {/* INPUT FORM (Bottom on Mobile, Left on Desktop) */}
                        <div className="order-2 lg:order-1 lg:col-span-3">
                            <ProjectInputForm params={projectA} setParams={setProjectA} label="Parâmetros do Projeto" />
                        </div>

                        {/* CHARTS & ANALYTICS (Top on Mobile, Right on Desktop) */}
                        <div className="order-1 lg:order-2 lg:col-span-9 space-y-6">


                            {/* Chart */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[500px] hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700">Fluxo de Caixa Livre e Acumulado</h3>
                                    {projectA.platformOwnership === 'chartered' && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium flex items-center gap-1">
                                            <Ship size={12} /> Plataforma Afretada (Custo Operacional)
                                        </span>
                                    )}
                                </div>
                                <ResponsiveContainer width="100%" height="90%">
                                    <ComposedChart data={resultsA.yearlyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="year"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            tickMargin={10}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'Anos', position: 'insideBottomRight', offset: -10, fontSize: 10, fill: '#64748b' }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tickFormatter={(v) => `$${(v / 1000000000).toFixed(1)}B`}
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b' }}
                                            label={{ value: 'FCL (USD)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b', dy: 40 }}
                                        />
                                        <YAxis yAxisId="right" orientation="right" hide />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            height={30}
                                            wrapperStyle={{ top: -10, right: 0, fontSize: '11px' }}
                                        />
                                        <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" />
                                        <Bar yAxisId="left" dataKey="freeCashFlow" name="FCL Anual" fill="#3b82f6" barSize={30} radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="accumulatedCashFlow" name="Acumulado" stroke="#10b981" strokeWidth={3} dot={false} />
                                        <Line yAxisId="left" type="step" dataKey="taxes" name="Impostos" stroke="#9333ea" strokeWidth={2} dot={false} opacity={0.6} />
                                        {projectA.platformOwnership === 'chartered' && (
                                            <Line yAxisId="left" type="monotone" dataKey="charterCost" name="Custo Afretamento" stroke="#ea580c" strokeWidth={2} dot={false} />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Analysis Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Box: Sensibilidade CAPEX */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-72 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-slate-700">Sensibilidade da TIR - TMA e VPL/IA ao CAPEX</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                type="number"
                                                dataKey="spread"
                                                name="Spread"
                                                unit="%"
                                                fontSize={10}
                                                tick={{ fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'Spread (TIR - TMA) [%]', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }}
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey="vpl_ia"
                                                name="VPL/IA"
                                                fontSize={10}
                                                tick={{ fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'VPL / IA (x)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10, fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Scatter name="Sensibilidade" data={resultsA.capexSensitivityData} fill="#8884d8" line={{ stroke: '#8884d8', strokeWidth: 2 }}>
                                                {resultsA.capexSensitivityData.map((entry, index) => (
                                                    <cell key={`cell-${index}`} fill={entry.isBase ? '#ef4444' : '#8884d8'} r={entry.isBase ? 6 : 4} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-72 hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-slate-700 mb-2">Perfil VPL (Taxa de Desconto)</h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <LineChart data={resultsA.npvProfile} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="rate" fontSize={10} tickFormatter={(v) => `${v}%`} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} tickFormatter={(v) => `$${v / 1000000000}B`} width={50} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(v) => `Taxa: ${v}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <ReferenceLine y={0} stroke="#94a3b8" />
                                            <Line type="monotone" dataKey="npv" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: PRODUCTION CURVE --- */}
                {activeTab === 'production' && (
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                        {/* CONTROLS (Bottom on Mobile) */}
                        <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-blue-600" /> Parâmetros de Produção
                                </h2>

                                <div className="space-y-6">
                                    {/* Perfis Pré-definidos */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">Perfil de Campo (Tipo)</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button onClick={() => applyProductionProfile('pre-salt')} className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                                                <div className="font-bold text-sm text-slate-800">Pré-Sal Offshore (Brasil)</div>
                                                <div className="text-[10px] text-slate-500">Alta produtividade, platô estendido (4 anos), declínio 8%.</div>
                                            </button>
                                            <button onClick={() => applyProductionProfile('post-salt')} className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                                                <div className="font-bold text-sm text-slate-800">Pós-Sal Offshore (Brasil)</div>
                                                <div className="text-[10px] text-slate-500">Campos maduros, declínio mais acentuado (12%), rampa suave.</div>
                                            </button>
                                            <button onClick={() => applyProductionProfile('onshore')} className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                                                <div className="font-bold text-sm text-slate-800">Onshore (Brasil)</div>
                                                <div className="text-[10px] text-slate-500">Vida longa, platô estendido (6 anos), declínio lento (6%).</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Definição de Volume Total */}
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <label className="block text-sm font-bold text-emerald-800 mb-1">Volume Total Recuperável (MM bbl)</label>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="number"
                                                value={projectA.totalReserves}
                                                onChange={(e) => handleChangeProjectA('totalReserves', Number(e.target.value))}
                                                className="w-full p-2 border border-emerald-300 rounded text-right font-mono font-bold outline-none ring-offset-1 focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                        <button
                                            onClick={applyReservesToPeak}
                                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Calcular Pico Necessário
                                        </button>
                                        <div className="mt-2 text-center text-[10px] text-emerald-700">
                                            Pico atual: <span className="font-bold">{projectA.peakProduction} kbpd</span>
                                        </div>
                                    </div>

                                    {/* Sliders de Ajuste Fino */}
                                    <div className="space-y-4 pt-2 border-t border-slate-100">
                                        <h4 className="text-xs font-bold uppercase text-slate-400">Ajuste Fino da Curva</h4>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                <span>Tempo de Ramp up (anos)</span>
                                                <span className="font-bold">{projectA.rampUpDuration}</span>
                                            </label>
                                            <input type="range" min="1" max="10" value={projectA.rampUpDuration} onChange={(e) => handleChangeProjectA('rampUpDuration', Number(e.target.value))} className="w-full accent-blue-600" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                <span>Duração do Platô (anos)</span>
                                                <span className="font-bold">{projectA.plateauDuration}</span>
                                            </label>
                                            <input type="range" min="0" max="15" value={projectA.plateauDuration} onChange={(e) => handleChangeProjectA('plateauDuration', Number(e.target.value))} className="w-full accent-blue-600" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                <span>Taxa de Declínio (%)</span>
                                                <span className="font-bold">{projectA.declineRate}%</span>
                                            </label>
                                            <input type="range" min="1" max="30" value={projectA.declineRate} onChange={(e) => handleChangeProjectA('declineRate', Number(e.target.value))} className="w-full accent-blue-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CHART (Top on Mobile) */}
                        <div className="order-1 lg:order-2 lg:col-span-8 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[500px]">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Curva de Produção Estimada</h3>
                                <p className="text-sm text-slate-500 mb-6">Perfil de produção anual em mil barris por dia (kbpd).</p>

                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={productionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" label={{ value: 'Ano', position: 'insideBottom', offset: -5, fill: '#64748b' }} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis label={{ value: 'Produção (kbpd)', angle: -90, position: 'insideLeft', fill: '#64748b' }} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <Tooltip labelFormatter={(l) => `Ano ${l}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="volume" stroke="#10b981" fillOpacity={1} fill="url(#colorProd)" strokeWidth={3} name="Volume (kbpd)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: BRENT CURVE --- */}
                {activeTab === 'brent' && (
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                        {/* CONTROLS */}
                        <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" /> Cenários de Preço Brent
                                </h2>

                                <div className="space-y-4">
                                    {/* ... Options ... */}
                                    {['constant', 'market_bull', 'market_bear', 'custom'].map(s => {
                                        const labels = {
                                            'constant': 'Constante',
                                            'market_bull': 'Otimista',
                                            'market_bear': 'Transição Energética',
                                            'custom': 'Personalizado'
                                        };
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => handleChangeProjectA('brentStrategy', s)}
                                                className={`w-full p-3 text-left rounded-lg border transition-all ${projectA.brentStrategy === s ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className="font-bold text-sm text-slate-800 capitalize">{labels[s]}</div>
                                            </button>
                                        );
                                    })}

                                    {projectA.brentStrategy === 'custom' && (
                                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="text-xs font-bold uppercase text-purple-800 mb-2">Parâmetros da Curva</h4>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                    <span>Preço Inicial (Ano 0)</span>
                                                    <span className="font-bold">${projectA.brentPrice}</span>
                                                </label>
                                                <input type="range" min="30" max="150" value={projectA.brentPrice} onChange={(e) => handleChangeProjectA('brentPrice', Number(e.target.value))} className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                    <span>Ano de Pico</span>
                                                    <span className="font-bold">Ano {projectA.brentPeakYear || 5}</span>
                                                </label>
                                                <input type="range" min="1" max="20" step="1"
                                                    value={projectA.brentPeakYear || 5}
                                                    onChange={(e) => handleChangeProjectA('brentPeakYear', Number(e.target.value))}
                                                    className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                    <span>Valor no Pico ($)</span>
                                                    <span className="font-bold">${projectA.brentPeakValue || 90}</span>
                                                </label>
                                                <input type="range" min="30" max="200" step="1"
                                                    value={projectA.brentPeakValue || 90}
                                                    onChange={(e) => handleChangeProjectA('brentPeakValue', Number(e.target.value))}
                                                    className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 flex justify-between">
                                                    <span>Longo Prazo ($)</span>
                                                    <span className="font-bold">${projectA.brentLongTerm || 60}</span>
                                                </label>
                                                <input type="range" min="30" max="150" step="1"
                                                    value={projectA.brentLongTerm || 60}
                                                    onChange={(e) => handleChangeProjectA('brentLongTerm', Number(e.target.value))}
                                                    className="w-full accent-purple-600" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CHART */}
                        <div className="order-1 lg:order-2 lg:col-span-8 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[500px]">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Projeção do Preço Brent (Nominal)</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={brentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorBrent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" label={{ value: 'Ano do Projeto', position: 'insideBottom', offset: -5, fill: '#64748b' }} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 'auto']} label={{ value: 'USD/bbl', angle: -90, position: 'insideLeft', fill: '#64748b' }} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="price" stroke="#2563eb" fillOpacity={1} fill="url(#colorBrent)" strokeWidth={3} name="Preço Brent" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: TAX (FISCAL) --- */}
                {activeTab === 'tax' && (
                    <TaxParameters params={projectA} setParams={setProjectA} />
                )}

                {/* --- VIEW: COMPARE --- */}
                {activeTab === 'compare' && (
                    <ComparisonView
                        projectA={projectA}
                        setProjectA={setProjectA}
                        projectB={projectB}
                        setProjectB={setProjectB}
                        resultsA={resultsA}
                        resultsB={resultsB}
                        copyAToB={() => setProjectB({ ...projectA })}
                    />
                )}

                {/* Placeholder for other tabs if they were fully implemented or if user switches to them */}
                {(activeTab === 'cashflow_table') && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <CashFlowTable data={resultsA.yearlyData} />
                    </div>
                )}

            </div>
        </div>
    );
}