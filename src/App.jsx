import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ComposedChart, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import {
    Activity, LayoutTemplate, LineChart as ChartIcon, Landmark, Settings,
    Split, Table as TableIcon, Maximize, Minimize, TrendingUp, BookOpen, Wrench,
    Moon, Sun, Anchor, Book
} from 'lucide-react';

import { useTheme } from './hooks/useTheme';

import KPICard from './components/KPICard';
import ProjectInputForm from './components/ProjectInputForm';
import TaxParameters from './components/TaxParameters';
import OpexParameters from './components/OpexParameters';
import ProductionParameters from './components/ProductionParameters';
import ComparisonView from './components/ComparisonView';
import CashFlowTable from './components/CashFlowTable';
import TornadoTest from './components/Test/TornadoTest';
import ReferencesTable from './components/ReferencesTable';
import CapexMain from './components/Capex/CapexMain';
import DocumentationTab from './components/DocumentationTab';
import { useProjectCalculations } from './hooks/useProjectCalculations';
import {
    formatCurrency, formatBillions, formatMillionsNoDecimals, calculatePeakFromReserves, getBrentCurve
} from './utils/calculations';

// --- Componente Principal ---

export default function App() {
    console.log("--- APP MOUNTING: Starting Simulator ---");
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('single');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCssFullScreen, setIsCssFullScreen] = useState(false);
    const containerRef = useRef(null);

    // Estados dos Projetos
    const [capexActiveModule, setCapexActiveModule] = useState('selection'); // Lifted state for navigation

    const handleNavigateToWells = () => {
        // Ensure Detailed Mode is ON
        setProjectA(prev => ({
            ...prev,
            wellsParams: {
                ...prev.wellsParams,
                mode: 'detailed'
            }
        }));
        setCapexActiveModule('wells');
        setActiveTab('capex');
    };
    const defaultParams = {
        totalCapex: 6000000000,
        capexDuration: 5,
        capexPeakRelative: 4, // Ano do pico de investimento (1 a capexDuration)
        capexConcentration: 50, // Concentração em % (0-100)

        // Contratação & Incentivos
        platformOwnership: 'owned',
        charterPV: 2000000000, // Default 2Bi para PV de afretamento
        charterSplitPercent: 85, // 85% Charter, 15% Service
        repetroRatio: { platform: 95, wells: 45, subsea: 75 }, // Detalhado por componente
        capexTaxRate: 40, // Alíquota cheia s/ benefício

        brentPrice: 70,
        brentSpread: 0,
        brentStrategy: 'constant',
        brentLongTerm: 60,
        brentPeakValue: 90,
        brentPeakYear: 5,

        peakProduction: 180,
        rampUpDuration: 3,
        plateauDuration: 4,
        declineRate: 8,
        hyperbolicFactor: 0.5, // Fator Hiperbólico (b)
        baseDeclineRate: 8, // Persist manual setting base for optimizations

        // Produção Detalhada
        productionMode: 'simple', // 'simple' | 'detailed'
        oilAPI: 28, // Grau API típico offshore
        gor: 150, // Razão Gás-Óleo m³/m³
        maxLiquids: 252000, // Capacidade de líquidos bpd (1.4 * 180k)

        // Parâmetros BSW (Função Logística) - Defaults Inteligente Hidráulica
        bswMax: 95, // Corte de água máximo (%)
        bswBreakthrough: 7, // Ano do breakthrough (t_bt) - Inteligente Hidráulica
        bswGrowthRate: 0.7, // Velocidade de crescimento (k) - Inteligente Hidráulica



        // OPEX
        opexMargin: 20,
        opexMode: 'simple', // 'simple' | 'detailed'
        opexFixed: 100000000, // $100M/ano (típico para ~150kbpd)
        opexVariable: 4, // $4/bbl
        workoverCost: 57600000, // Calculated default for 16 wells
        workoverLambda: 0.15,
        workoverMobCost: 8,
        workoverDuration: 20,
        workoverTesp: 90,
        workoverDailyRate: 800,
        costInflation: 2, // 2% a.a.

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
            platform: { method: 'accelerated', years: 2 },
            wells: { method: 'uop', years: 5 },
            subsea: { method: 'accelerated', years: 2 }
        },

        // --- Persistence for FPSO Module ---
        fpsoParams: {
            mode: 'simple',
            simpleTotal: 2500,
        },
        wellsParams: {
            mode: 'simple',
            simpleTotal: 2000,
        },
    };

    const [projectA, setProjectA] = useState({ ...defaultParams });
    const [projectB, setProjectB] = useState({
        ...defaultParams,
        totalCapex: 7000000000,
        peakProduction: 180,
        plateauDuration: 4,
        platformOwnership: 'chartered',
        charterPV: 2500000000,
        charterSplit: { charter: 85, service: 15 },
        serviceTaxRate: 14.25
    });

    // Cálculos
    const resultsA = useProjectCalculations(projectA);
    const resultsB = useProjectCalculations(projectB);

    // ERROR BOUNDARY DISPLAY
    if (resultsA.error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white p-10">
                <div className="max-w-2xl bg-red-900/50 border border-red-500 p-8 rounded-xl">
                    <h1 className="text-3xl font-bold mb-4 text-red-200">Critical Calculation Error</h1>
                    <pre className="whitespace-pre-wrap bg-black/50 p-4 rounded text-red-100 font-mono text-sm overflow-auto max-h-[60vh]">
                        {resultsA.error}
                        {'\n\nCall Stack (check console for full details).'}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                    >
                        Reload Simulator
                    </button>
                </div>
            </div>
        );
    }

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
            .map(d => ({
                year: d.year,
                volume: d.productionVolume,
                waterVolume: d.waterVolume || 0,
                liquidVolume: d.liquidVolume || 0,
                bsw: d.bsw || 0
            }));
    }, [resultsA]);

    const handleChangeProjectA = (field, value) => {
        setProjectA(prev => {
            const updates = { [field]: value };
            // If user manually changes decline rate, reset base (overwrites optimization)
            if (field === 'declineRate') {
                updates.baseDeclineRate = value;
            }
            return { ...prev, ...updates };
        });
    };

    const handleUpdateCapex = useCallback((fpsoCostMillions, detailedParams) => {
        setProjectA(prev => {
            // New Logic: FPSO determines the Total Project Value based on a fixed 45% share
            // Target Split: FPSO (45%), Wells (35%), Subsea (20%)

            const newFpsoCost = fpsoCostMillions * 1000000;

            // Calculate Total CAPEX assuming FPSO is 45%
            // Avoid division by zero
            const newTotalCapex = newFpsoCost > 0 ? newFpsoCost / 0.45 : prev.totalCapex;

            const newSplit = {
                platform: 45,
                wells: 35,
                subsea: 20
            };

            return {
                ...prev,
                totalCapex: newTotalCapex,
                capexSplit: newSplit,
                fpsoParams: detailedParams
            };
        });
    }, []);

    const handleUpdateWells = useCallback((wellsCostMillions, detailedParams) => {
        setProjectA(prev => {
            // Strategy: Keep FPSO and Subsea ABSOLUTE costs constant, update Wells, sum for new Total
            const currentTotal = prev.totalCapex;
            const fpsoCost = currentTotal * (prev.capexSplit.platform / 100);
            const subseaCost = currentTotal * (prev.capexSplit.subsea / 100);

            const newWellsCost = wellsCostMillions * 1000000;
            const newTotalCapex = fpsoCost + subseaCost + newWellsCost;

            const safeTotal = newTotalCapex > 0 ? newTotalCapex : 1;

            const newSplit = {
                platform: (fpsoCost / safeTotal) * 100,
                wells: (newWellsCost / safeTotal) * 100,
                subsea: (subseaCost / safeTotal) * 100
            };

            // --- Smart Well Impact on Decline Rate ---
            // Recalculate based on Base Decline Rate (prevents compounding)
            const baseDecline = prev.baseDeclineRate || prev.declineRate;
            let newDeclineRate = baseDecline;

            if (detailedParams?.useSmartWell && detailedParams?.useFOH) {
                const increase = detailedParams.fohRecoveryFactorIncrease || 5;
                const improvement = increase / 100; // Convert percentage to decimal
                newDeclineRate = baseDecline * (1 - improvement);
            }

            // --- Sync Workover Cost with Well Count & Type ---
            const numCurrentWells = detailedParams?.numWells || 16;
            const wType = detailedParams?.wellType || 'pre';
            const wComp = detailedParams?.complexity || 'high';

            let lambda = 0.15, mob = 8, dur = 20, rate = 800;

            // Logic Matrix
            if (wType === 'pre') {
                if (wComp === 'high') { lambda = 0.15; mob = 20; dur = 60; rate = 800; }
                else { lambda = 0.10; mob = 8; dur = 40; rate = 600; }
            } else { // post
                if (wComp === 'high') { lambda = 0.15; mob = 5; dur = 30; rate = 250; }
                else { lambda = 0.10; mob = 3; dur = 20; rate = 100; }
            }

            const costPerEvent = mob + (dur * rate / 1000);
            const newWorkoverCost = numCurrentWells * lambda * costPerEvent * 1000000;

            return {
                ...prev,
                totalCapex: newTotalCapex,
                capexSplit: newSplit,
                wellsParams: detailedParams,
                declineRate: parseFloat(newDeclineRate.toFixed(2)),
                baseDeclineRate: baseDecline, // Ensure base is persisted
                // Automatic Workover Updates
                workoverCost: newWorkoverCost,
                workoverLambda: lambda,
                workoverMobCost: mob,
                workoverDuration: dur,
                workoverDailyRate: rate
            };
        });
    }, []);



    const applyProductionProfile = (type) => {
        let updates = {};
        if (type === 'pre-salt') updates = { rampUpDuration: 3, plateauDuration: 4, declineRate: 8, baseDeclineRate: 8 };
        else if (type === 'post-salt') updates = { rampUpDuration: 4, plateauDuration: 2, declineRate: 12, baseDeclineRate: 12 };
        else if (type === 'onshore') updates = { rampUpDuration: 1, plateauDuration: 6, declineRate: 6, baseDeclineRate: 6 };

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
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">Ano {label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500 dark:text-slate-400">Receita:</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatMillionsNoDecimals(data.revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500 dark:text-slate-400">OPEX:</span>
                            <span className="font-medium text-red-500 dark:text-red-400">{formatMillionsNoDecimals(Math.abs(data.opex))}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500 dark:text-slate-400">Depreciação:</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{formatMillionsNoDecimals(Math.abs(data.depreciation))}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500 dark:text-slate-400">Impostos:</span>
                            <span className="font-medium text-purple-600 dark:text-purple-400">{formatMillionsNoDecimals(Math.abs(data.taxes))}</span>
                        </div>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                            <div className="flex justify-between gap-4 font-bold">
                                <span className="text-blue-600 dark:text-blue-400">FCL:</span>
                                <span className="dark:text-slate-200">{formatMillionsNoDecimals(data.freeCashFlow)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-emerald-500 dark:text-emerald-400">
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
        <div ref={containerRef} className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-auto transition-colors duration-300 ${isCssFullScreen ? 'fixed inset-0 z-[9999]' : ''}`}>

            {/* Navbar / Tabs */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 lg:px-6 lg:py-4 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-white shadow-lg shadow-blue-200 shrink-0">
                        <Activity size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 truncate">Simulador E&P</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Análise Econômica de Projetos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto overflow-hidden">
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto w-full lg:w-auto no-scrollbar mask-gradient-right border border-transparent dark:border-slate-800 transition-colors">
                        {['single', 'tornado_test', 'production', 'opex', 'capex', 'brent', 'tax', 'compare', 'cashflow_table', 'manual', 'references'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-700 dark:text-blue-400 ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}
                            >
                                {tab === 'single' && <LayoutTemplate size={16} />}
                                {tab === 'production' && <Settings size={16} />}
                                {tab === 'opex' && <Wrench size={16} />}
                                {tab === 'capex' && <Anchor size={16} />}
                                {tab === 'brent' && <ChartIcon size={16} />}
                                {tab === 'tax' && <Landmark size={16} />}
                                {tab === 'compare' && <Split size={16} />}
                                {tab === 'cashflow_table' && <TableIcon size={16} />}
                                {tab === 'manual' && <Book size={16} />}
                                {tab === 'references' && <BookOpen size={16} />}
                                <span className="capitalize">{tab === 'single' ? 'Dashboard' : tab === 'production' ? 'Produção' : tab === 'opex' ? 'Custos' : tab === 'capex' ? 'CAPEX' : tab === 'tax' ? 'Tributos' : tab === 'compare' ? 'Comparar' : tab === 'brent' ? 'Preços' : tab === 'cashflow_table' ? 'Tabela' : tab === 'manual' ? 'Manual' : tab === 'tornado_test' ? 'Teste' : 'Referências'}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                            title={theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={toggleFullScreen}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                            title="Tela Inteira"
                        >
                            {isFullScreen || isCssFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">


                {/* --- PERSISTENT HEADER: Economic Indicators --- */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KPICard title="VPL (NPV)" value={formatBillions(resultsA.metrics.vpl)} type={resultsA.metrics.vpl > 0 ? 'positive' : 'negative'} subtext="Valor Presente Líquido" />
                    <KPICard title="TIR (IRR)" value={resultsA.metrics.tir ? `${resultsA.metrics.tir.toFixed(2)}%` : 'N/A'} type="blue" subtext={`TMA: ${projectA.discountRate}%`} />
                    <KPICard title="TIR - TMA" value={resultsA.metrics.spread ? `${resultsA.metrics.spread.toFixed(2)}%` : '-'} type={resultsA.metrics.spread > 0 ? 'positive' : 'negative'} subtext="Spread de Retorno" />
                    <KPICard title="VPL / IA" value={resultsA.metrics.vpl_ia.toFixed(2) + 'x'} type={resultsA.metrics.vpl_ia > 0 ? 'purple' : 'neutral'} subtext="Eficiência do Investimento" />
                    <KPICard title="Payback" value={resultsA.metrics.payback ? `${resultsA.metrics.payback.toFixed(1)} anos` : '> Dur.'} type="neutral" subtext="Descontado" />
                    <KPICard title="Brent Equilíbrio" value={resultsA.metrics.breakevenBrent ? `$${resultsA.metrics.breakevenBrent.toFixed(2)}` : 'N/A'} type="neutral" subtext="Preço para VPL = 0" tooltip="Preço constante do Brent necessário para zerar o VPL do projeto (Breakeven Price)." />
                </div>

                {/* --- VIEW: SINGLE --- */}
                {activeTab === 'single' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* INPUT FORM (Top on Mobile, Left on Desktop) */}
                        <div className="lg:col-span-3">
                            <ProjectInputForm
                                params={projectA}
                                setParams={setProjectA}
                                label="Parâmetros do Projeto"
                                onNavigateToCapex={() => setActiveTab('capex')}
                                onNavigateToOpex={() => setActiveTab('opex')}
                            />
                        </div>

                        {/* CHARTS & ANALYTICS (Bottom on Mobile, Right on Desktop) */}
                        <div className="lg:col-span-9 space-y-6">


                            {/* Chart */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px] hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">Fluxo de Caixa Livre e Acumulado</h3>
                                    {projectA.platformOwnership === 'chartered' && (
                                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded font-medium flex items-center gap-1">
                                            <Ship size={12} /> Plataforma Afretada (Custo Operacional)
                                        </span>
                                    )}
                                </div>
                                <ResponsiveContainer width="100%" height="90%">
                                    <ComposedChart data={resultsA.yearlyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                        <XAxis
                                            dataKey="year"
                                            tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            tickMargin={10}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'Anos', position: 'insideBottomRight', offset: -10, fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tickFormatter={(v) => `$${(v / 1000000000).toFixed(1)}B`}
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            label={{ value: 'FCL (USD)', angle: -90, position: 'insideLeft', fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b', dy: 40 }}
                                        />
                                        <YAxis yAxisId="right" orientation="right" hide />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            height={30}
                                            wrapperStyle={{ top: -10, right: 0, fontSize: '11px', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                        />
                                        <ReferenceLine yAxisId="left" y={0} stroke={theme === 'dark' ? '#475569' : '#cbd5e1'} />
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
                                {/* Box: Sensibilidade CAPEX */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-72 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">Sensibilidade da TIR - TMA e VPL/IA ao CAPEX</h3>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700" title="Correlação Linear de Pearson">
                                            r = {resultsA.sensitivityCorrelation?.toFixed(4)}
                                        </span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                            <XAxis
                                                type="number"
                                                dataKey="spread"
                                                name="Spread"
                                                unit="%"
                                                fontSize={10}
                                                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'Spread (TIR - TMA) [%]', position: 'insideBottom', offset: -10, fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey="vpl_ia"
                                                name="VPL/IA"
                                                fontSize={10}
                                                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'VPL / IA (x)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg outline-none">
                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                                                    Variação CAPEX: <span className={data.variation > 0 ? 'text-red-600 dark:text-red-400' : data.variation < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                                                                        {data.variation > 0 ? '+' : ''}{data.variation.toFixed(0)}%
                                                                    </span>
                                                                </p>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Spread (TIR - TMA): <span className="font-medium text-slate-700 dark:text-slate-200">{data.spread?.toFixed(1)}%</span></p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400">VPL / IA: <span className="font-medium text-slate-700 dark:text-slate-200">{data.vpl_ia?.toFixed(1)}x</span></p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Scatter name="Sensibilidade" data={resultsA.capexSensitivityData} fill="#8884d8" line={{ stroke: '#8884d8', strokeWidth: 2 }}>
                                                {resultsA.capexSensitivityData.map((entry, index) => (
                                                    <cell key={`cell-${index}`} fill={entry.isBase ? '#ef4444' : '#8884d8'} r={entry.isBase ? 6 : 4} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-72 hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100 mb-2">Perfil VPL (Taxa de Desconto)</h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <LineChart data={resultsA.npvProfile} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                            <XAxis
                                                dataKey="rate"
                                                fontSize={10}
                                                tickFormatter={(v) => `${v}%`}
                                                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'Taxa de Desconto (%)', position: 'insideBottom', offset: -5, fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            />
                                            <YAxis
                                                fontSize={10}
                                                tickFormatter={(v) => `$${v / 1000000000}B`}
                                                width={50}
                                                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'VPL (USD)', angle: -90, position: 'insideLeft', fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            />
                                            <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(v) => `Taxa: ${v}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }} />
                                            <ReferenceLine y={0} stroke={theme === 'dark' ? '#94a3b8' : '#94a3b8'} />
                                            <Line type="monotone" dataKey="npv" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-96 hover:shadow-md transition-shadow">
                                <div className="mb-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">Correlação entre o Prêmio de Rentabilidade (TIR - TMA) e a Eficiência do Investimento (VPL / IA)</h3>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700" title="Correlação Linear de Pearson">
                                            r = {resultsA.mcCorrelation?.toFixed(4)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Simulação baseada em 500 iterações com variações aleatórias em: CAPEX Total, Concentração de CAPEX, Ano de Pico, Curva de Produção (Ramp-up, Plateau, Declínio), Pico de Produção, Margem Operacional e Custos Fixos/Variáveis.
                                    </p>
                                </div>
                                <ResponsiveContainer width="100%" height="85%">
                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                        <XAxis
                                            type="number"
                                            dataKey="spread"
                                            name="Spread"
                                            unit="%"
                                            fontSize={10}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'Spread (TIR - TMA) [%]', position: 'insideBottom', offset: -10, fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="vpl_ia"
                                            name="VPL/IA"
                                            fontSize={10}
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'VPL / IA (x)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                                        />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    // Ignora ponto da linha
                                                    if (data.id === undefined) return null;

                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg outline-none">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Cenário #{data.id}</p>
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">Spread: <span className="font-medium text-slate-700 dark:text-slate-200">{data.spread?.toFixed(2)}%</span></p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">VPL / IA: <span className="font-medium text-slate-700 dark:text-slate-200">{data.vpl_ia?.toFixed(2)}x</span></p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Cenários" data={resultsA.monteCarloData} fill="#10b981" fillOpacity={0.15} line={false} />

                                        {resultsA.trendLine && resultsA.trendLine.length > 0 && (
                                            <Scatter
                                                name="Tendência"
                                                data={resultsA.trendLine}
                                                line={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }}
                                                shape={false}
                                                legendType="none"
                                            />
                                        )}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW: PRODUCTION CURVE --- */}
                {activeTab === 'production' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* CONTROLS - Using new ProductionParameters component */}
                        <div className="lg:col-span-5">
                            <ProductionParameters params={projectA} setParams={setProjectA} />
                            {/* <div className="p-4 bg-red-100 text-red-800">Production Parameters Disabled</div> */}
                        </div>

                        {/* CHART */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px]">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Curva de Produção Estimada</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Perfil de produção anual em mil barris por dia (kbpd).</p>

                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={productionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" label={{ value: 'Ano', position: 'insideBottom', offset: -5, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis label={{ value: 'Produção (kbpd)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                        <Tooltip labelFormatter={(l) => `Ano ${l}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }} />
                                        <Area type="monotone" dataKey="volume" stroke="#10b981" fillOpacity={1} fill="url(#colorProd)" strokeWidth={3} name="Volume (kbpd)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* LIQUIDS CHART (Detailed Mode Only) */}
                            {projectA.productionMode === 'detailed' && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px] animate-in fade-in slide-in-from-bottom-4">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Perfil de Produção de Líquidos (Óleo + Água)</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Visualização do corte de água (BSW) e gargalo de processamento.</p>

                                    <ResponsiveContainer width="100%" height="85%">
                                        <AreaChart data={productionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorOil" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                                </linearGradient>
                                                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="year" label={{ value: 'Ano', position: 'insideBottom', offset: -5, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis label={{ value: 'Vazão (kbpd)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                            <Tooltip
                                                labelFormatter={(l) => `Ano ${l}`}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}
                                                formatter={(value, name, props) => {
                                                    if (name === 'BSW') return [`${(value * 100).toFixed(1)}%`, name];
                                                    return [`${Number(value).toFixed(0)} kbpd`, name];
                                                }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <ReferenceLine y={projectA.maxLiquids / 1000} label={{ value: 'Capacidade (Líq)', fill: theme === 'dark' ? '#ef4444' : '#ef4444', fontSize: 10, position: 'insideTopRight' }} stroke="#ef4444" strokeDasharray="3 3" />

                                            <Area type="monotone" dataKey="waterVolume" stackId="1" stroke="#3b82f6" fill="url(#colorWater)" name="Água Produzida" />
                                            <Area type="monotone" dataKey="volume" stackId="1" stroke="#10b981" fill="url(#colorOil)" name="Óleo Produzido" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}


                        </div>
                    </div>
                )}

                {/* --- VIEW: BRENT CURVE --- */}
                {activeTab === 'brent' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* CONTROLS */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
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
                                                className={`w-full p-3 text-left rounded-lg border transition-all ${projectA.brentStrategy === s ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <div className="font-bold text-sm text-slate-800 dark:text-slate-100 capitalize">{labels[s]}</div>
                                            </button>
                                        );
                                    })}

                                    {projectA.brentStrategy === 'custom' && (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="text-xs font-bold uppercase text-purple-800 dark:text-purple-200 mb-2">Parâmetros da Curva</h4>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex justify-between">
                                                    <span>Preço Inicial (Ano 0)</span>
                                                    <span className="font-bold">${projectA.brentPrice}</span>
                                                </label>
                                                <input type="range" min="30" max="150" value={projectA.brentPrice} onChange={(e) => handleChangeProjectA('brentPrice', Number(e.target.value))} className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex justify-between">
                                                    <span>Ano de Pico</span>
                                                    <span className="font-bold">Ano {projectA.brentPeakYear || 5}</span>
                                                </label>
                                                <input type="range" min="1" max="20" step="1"
                                                    value={projectA.brentPeakYear || 5}
                                                    onChange={(e) => handleChangeProjectA('brentPeakYear', Number(e.target.value))}
                                                    className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex justify-between">
                                                    <span>Valor no Pico ($)</span>
                                                    <span className="font-bold">${projectA.brentPeakValue || 90}</span>
                                                </label>
                                                <input type="range" min="30" max="200" step="1"
                                                    value={projectA.brentPeakValue || 90}
                                                    onChange={(e) => handleChangeProjectA('brentPeakValue', Number(e.target.value))}
                                                    className="w-full accent-purple-600" />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex justify-between">
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
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px]">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Projeção do Preço Brent (Nominal)</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={brentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorBrent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" label={{ value: 'Ano do Projeto', position: 'insideBottom', offset: -5, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 'auto']} label={{ value: 'USD/bbl', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }} />
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
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CashFlowTable data={resultsA.yearlyData} />
                    </div>
                )}

                {/* --- VIEW: OPEX --- */}
                {activeTab === 'opex' && (
                    <OpexParameters
                        params={projectA}
                        setParams={setProjectA}
                        onNavigateToWells={handleNavigateToWells}
                    />
                )}

                {/* --- VIEW: CAPEX --- */}
                {activeTab === 'capex' && (
                    <CapexMain
                        currentParams={projectA.fpsoParams}
                        wellsParams={projectA.wellsParams}
                        peakProduction={projectA.peakProduction}
                        projectParams={projectA} // Pass full params for volume calc
                        unitNpv={(resultsA.metrics.vpl / (resultsA.yearlyData.reduce((acc, y) => acc + (y.productionVolume * 365), 0) / 1000 * 1000000)) || 5} // $/bbl (default 5 to avoid NaN)
                        onUpdate={handleUpdateCapex}
                        onUpdateWells={handleUpdateWells}
                        activeModule={capexActiveModule}
                        setActiveModule={setCapexActiveModule}
                    />
                )}

                {/* --- VIEW: DOCUMENTATION (Manual) --- */}
                {activeTab === 'manual' && (
                    <DocumentationTab />
                )}

                {/* --- VIEW: REFERENCES --- */}
                {activeTab === 'references' && (
                    <ReferencesTable />
                )}

                {/* --- VIEW: TORNADO TEST --- */}
                {activeTab === 'tornado_test' && (
                    <TornadoTest projectParams={projectA} />
                )}

            </div>
        </div >
    );
}