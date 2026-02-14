import React from 'react';
import { DollarSign, Percent, Wrench, Activity, Info, Droplet, BarChart2, TrendingUp, Eye, EyeOff, Anchor } from 'lucide-react';
import { formatCurrency, formatMillionsNoDecimals, generateProjectData } from '../utils/calculations';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OpexParameters = ({ params, setParams, onNavigateToWells }) => {
    const [showFailureChart, setShowFailureChart] = React.useState(false);

    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    // Auto-calculate total workover cost when dependencies change (e.g. well count)
    React.useEffect(() => {
        const numWells = params.wellsParams?.numWells || 16;
        const lambda = params.workoverLambda || 0.15;
        const mob = params.workoverMobCost || 8;
        const dur = params.workoverDuration || 20;
        const rate = params.workoverDailyRate || 800;

        const costPerEvent = mob + (dur * rate / 1000);
        const calculatedTotal = numWells * lambda * costPerEvent * 1000000;

        // Update if the current stored cost differs significantly from calculation
        if (Math.abs((params.workoverCost || 0) - calculatedTotal) > 100) {
            setParams(prev => ({ ...prev, workoverCost: calculatedTotal }));
        }
    }, [
        params.wellsParams?.numWells,
        params.workoverLambda,
        params.workoverMobCost,
        params.workoverDuration,
        params.workoverDailyRate,
        setParams
    ]);

    // Calculate typical OPEX values based on unit capacity (peakProduction)
    const capacity = params.peakProduction || 150; // kbpd
    const typicalOpexFixed = Math.round(capacity * 0.6 * 1000000); // ~$0.6M per kbpd/year
    const typicalOpexVariable = 4; // $4/bbl typical
    const typicalWorkover = Math.round(capacity * 0.06 * 1000000); // ~$60k per kbpd/year

    const suggestTypicalValues = () => {
        setParams(prev => ({
            ...prev,
            opexFixed: typicalOpexFixed,
            opexVariable: typicalOpexVariable
        }));
    };

    // Calculate failure rate chart data (moved to component level to fix Hooks order)
    const failureChartData = React.useMemo(() => {
        if (params.opexMode !== 'detailed') return [];

        try {
            const projectDuration = params.projectDuration || 30;
            const lambdaAvg = params.workoverLambda || 0.15;
            const waitDays = params.workoverTesp || 90;
            const failureProfile = params.workoverFailureProfile || 'wearout';

            const projectData = generateProjectData(params);
            if (!projectData || !projectData.yearlyData) {
                return [];
            }

            const data = projectData.yearlyData;

            return data.filter(d => d && d.revenue > 0).map(d => {
                const year = d.year;
                let lambda;

                if (failureProfile === 'bathtub') {
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const centered = normalizedTime - 0.5;

                    const minLambda = lambdaAvg * 0.5;
                    const maxLambda = lambdaAvg * 2.0;
                    const a = (maxLambda - minLambda) * 4;
                    const b = minLambda;

                    lambda = a * centered * centered + b;
                    lambda = Math.max(0, Math.min(maxLambda, lambda));
                } else {
                    const growthFactor = 1.5;
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
                    lambda = Math.max(0, lambdaAvg * multiplier);
                }

                // Calculate production loss for this year
                const daysLostPerYear = lambda * waitDays;
                const efficiencyLoss = Math.min(1, Math.max(0, daysLostPerYear / 365));
                const productionLossPct = efficiencyLoss * 100;

                // Calculate absolute production loss in MM bbl
                const brentPrice = params.brentPrice || 70;
                const revenue = d.revenue || 0;
                const productionMMbbl = revenue > 0 ? revenue / brentPrice / 1000000 : 0;
                const productionLossMMbbl = productionMMbbl * efficiencyLoss;

                return {
                    year: d.year,
                    lambda: lambda * 100, // Convert to percentage
                    lambdaAvg: lambdaAvg * 100, // Reference line
                    efficiencyLossPct: productionLossPct,
                    productionLossMMbbl: productionLossMMbbl || 0
                };
            });
        } catch (error) {
            console.error('Error generating failure chart data:', error);
            return [];
        }
    }, [params]);

    // Calculate realistic production loss considering temporal interaction between
    // failure profile and production profile
    const productionLossStats = React.useMemo(() => {
        if (params.opexMode !== 'detailed' || !params.workoverLambda || !params.workoverTesp) {
            return { lossPerWell: 0, totalLoss: 0 };
        }

        try {
            const projectDuration = params.projectDuration || 30;
            const lambdaAvg = params.workoverLambda;
            const waitDays = params.workoverTesp;
            const failureProfile = params.workoverFailureProfile || 'wearout';
            const numWells = params.wellsParams?.numWells || 16;
            const brentPrice = params.brentPrice || 70;

            const projectData = generateProjectData(params);
            if (!projectData || !projectData.yearlyData) {
                return { lossPerWell: 0, totalLoss: 0 };
            }

            let totalProductionLoss = 0; // in bbl

            projectData.yearlyData.forEach(d => {
                if (!d || d.revenue <= 0) return;

                const year = d.year;
                let lambda;

                // Calculate time-dependent lambda for this year
                if (failureProfile === 'bathtub') {
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const centered = normalizedTime - 0.5;

                    const minLambda = lambdaAvg * 0.5;
                    const maxLambda = lambdaAvg * 2.0;
                    const a = (maxLambda - minLambda) * 4;
                    const b = minLambda;

                    lambda = a * centered * centered + b;
                    lambda = Math.max(0, Math.min(maxLambda, lambda));
                } else {
                    const growthFactor = 1.5;
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
                    lambda = Math.max(0, lambdaAvg * multiplier);
                }

                // Calculate production loss for this specific year
                const daysLostPerYear = lambda * waitDays;
                const efficiencyLoss = Math.min(1, Math.max(0, daysLostPerYear / 365));

                // Get actual production for this year (before loss)
                const productionMMbbl = d.revenue / brentPrice / 1000000;
                const productionBbl = productionMMbbl * 1000000;

                // Add this year's loss to total
                totalProductionLoss += productionBbl * efficiencyLoss;
            });

            // Calculate per-well annual average
            const totalYears = projectData.yearlyData.filter(d => d && d.revenue > 0).length;
            const lossPerWell = totalYears > 0 ? totalProductionLoss / numWells / totalYears : 0;
            const totalLossPerYear = totalYears > 0 ? totalProductionLoss / totalYears : 0;

            // Calculate NPV loss from production losses
            // Uses actual government take from project calculations (royalties + special participation + taxes)
            const discountRate = (params.tma || 10) / 100;
            let npvLoss = 0;
            let totalGovRevenue = 0;
            let totalRevenueLost = 0;

            projectData.yearlyData.forEach((d, index) => {
                if (!d || d.revenue <= 0) return;

                const year = d.year;
                let lambda;

                // Calculate time-dependent lambda for this year
                if (failureProfile === 'bathtub') {
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const centered = normalizedTime - 0.5;

                    const minLambda = lambdaAvg * 0.5;
                    const maxLambda = lambdaAvg * 2.0;
                    const a = (maxLambda - minLambda) * 4;
                    const b = minLambda;

                    lambda = a * centered * centered + b;
                    lambda = Math.max(0, Math.min(maxLambda, lambda));
                } else {
                    const growthFactor = 1.5;
                    const normalizedTime = year / Math.max(projectDuration - 1, 1);
                    const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
                    lambda = Math.max(0, lambdaAvg * multiplier);
                }

                // Calculate production loss for this year
                const daysLostPerYear = lambda * waitDays;
                const efficiencyLoss = Math.min(1, Math.max(0, daysLostPerYear / 365));

                // Get actual production for this year
                const productionMMbbl = d.revenue / brentPrice / 1000000;
                const productionBbl = productionMMbbl * 1000000;
                const lostProductionBbl = productionBbl * efficiencyLoss;

                // Calculate lost revenue
                const lostRevenue = lostProductionBbl * brentPrice;
                totalRevenueLost += lostRevenue;

                // Calculate government take rate for this year from actual data
                // Note: d.taxes already includes royalties (see calculations.js line 654: taxes = royalties + corporateTax)
                // Government take = taxes + special participation + profit oil (DO NOT add royalties separately!)
                const yearTaxes = Math.abs(d.taxes || 0); // Already includes royalties + corporate tax
                const yearSpecialPart = Math.abs(d.specialParticipation || 0);
                const yearProfitOil = Math.abs(d.profitOilGov || 0);

                const totalGovRevenueThisYear = yearTaxes + yearSpecialPart + yearProfitOil;
                totalGovRevenue += totalGovRevenueThisYear;

                const govTakeRate = d.revenue > 0 ? totalGovRevenueThisYear / d.revenue : 0;

                // Calculate net lost revenue (what the company actually loses after government take)
                const netLostRevenue = lostRevenue * (1 - govTakeRate);

                // Discount to present value
                const discountFactor = Math.pow(1 + discountRate, -year);
                npvLoss += netLostRevenue * discountFactor;
            });

            // Calculate average government take rate across the project
            // Sum all government revenues and divide by total project revenue
            let totalProjectRevenue = 0;
            let totalProjectGovRevenue = 0;

            projectData.yearlyData.forEach(d => {
                if (!d || d.revenue <= 0) return;
                totalProjectRevenue += d.revenue;

                const yearTaxes = Math.abs(d.taxes || 0);
                const yearSpecialPart = Math.abs(d.specialParticipation || 0);
                const yearProfitOil = Math.abs(d.profitOilGov || 0);
                totalProjectGovRevenue += (yearTaxes + yearSpecialPart + yearProfitOil);
            });

            const avgGovTakeRate = totalProjectRevenue > 0 ?
                (totalProjectGovRevenue / totalProjectRevenue) * 100 :
                0;

            // Debug: log government take breakdown
            if (params.opexMode === 'detailed') {
                console.log('📊 Government Take Calc:', {
                    totalRevenue: `$${(totalProjectRevenue / 1000000).toFixed(1)}MM`,
                    totalGovRevenue: `$${(totalProjectGovRevenue / 1000000).toFixed(1)}MM`,
                    govTakeRate: `${avgGovTakeRate.toFixed(1)}%`
                });
            }

            return {
                lossPerWell, // bbl/year per well
                totalLoss: totalLossPerYear / 1000000, // MM bbl/year total
                npvLoss: npvLoss / 1000000, // MM USD - NPV of lost production
                govTakeRate: avgGovTakeRate // percentage for display
            };
        } catch (error) {
            console.error('Error calculating production loss:', error);
            return { lossPerWell: 0, totalLoss: 0, npvLoss: 0, govTakeRate: 0 };
        }
    }, [params]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT COLUMN: PARAMETERS */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Custos Operacionais (OPEX)</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Defina a estrutura de custos de operação da unidade.</p>
                        </div>
                    </div>

                    {/* MODE SWITCH */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex mb-6">
                        <button
                            onClick={() => handleChange('opexMode', 'simple')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${params.opexMode === 'simple' ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                        >
                            Simples
                        </button>
                        <button
                            onClick={() => {
                                handleChange('opexMode', 'detailed');
                                // Set default to Convencional
                                const numWells = params.wellsParams?.numWells || 16;
                                const lambda = 0.15;
                                const tesp = 90;
                                const costPerEvent = (params.workoverMobCost || 8) + ((params.workoverDuration || 20) * (params.workoverDailyRate || 800) / 1000);
                                const total = numWells * lambda * costPerEvent * 1000000;
                                setParams(prev => ({
                                    ...prev,
                                    opexMode: 'detailed',
                                    workoverLambda: lambda,
                                    workoverFailureProfile: 'wearout',
                                    workoverTesp: tesp,
                                    workoverCost: total
                                }));
                            }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${params.opexMode === 'detailed' ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                        >
                            Detalhado
                        </button>
                    </div>

                    {/* CAPACITY REFERENCE (only in detailed mode) */}
                    {params.opexMode === 'detailed' && (
                        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Capacidade da Unidade: <span className="font-bold">{capacity} kbpd</span></p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">Valores típicos calculados com base nesta capacidade (fontes: Petrobras, Rystad Energy)</p>
                            </div>
                            <button
                                onClick={suggestTypicalValues}
                                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Sugerir Valores Típicos
                            </button>
                        </div>
                    )}

                    {params.opexMode === 'simple' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2"><Percent size={16} className="text-slate-400 dark:text-slate-500" /> Margem Operacional (% da Receita Bruta)</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded">{params.opexMargin}%</span>
                                </label>
                                <input
                                    type="range" min="10" max="60" step="1"
                                    value={params.opexMargin}
                                    onChange={(e) => handleChange('opexMargin', Number(e.target.value))}
                                    className="w-full accent-purple-600"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Estima o OPEX total como uma porcentagem direta da receita bruta anual. Útil para fases iniciais de projeto (FEL 1/2).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* OPEX FIXO */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2"><DollarSign size={16} className="text-slate-400 dark:text-slate-500" /> OPEX Fixo (Anual)</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded">{formatMillionsNoDecimals(params.opexFixed)}/ano</span>
                                </label>
                                <input
                                    type="range" min="0" max="500000000" step="10000000"
                                    value={params.opexFixed}
                                    onChange={(e) => handleChange('opexFixed', Number(e.target.value))}
                                    className="w-full accent-purple-600"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Custos que não variam com a produção (Aluguel de Sonda, Pessoal, Logística Básica, Manutenção de Rotina). Representa ~90% do OPEX em offshore.
                                </p>
                            </div>

                            {/* OPEX VARIÁVEL */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2"><Activity size={16} className="text-slate-400 dark:text-slate-500" /> OPEX Variável (por Barril)</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded">{formatCurrency(params.opexVariable)}/bbl</span>
                                </label>
                                <input
                                    type="range" min="0" max="25" step="0.5"
                                    value={params.opexVariable}
                                    onChange={(e) => handleChange('opexVariable', Number(e.target.value))}
                                    className="w-full accent-purple-600"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Custos consumíveis (Produtos Químicos, Tratamento de Água, Energia extra) por barril produzido.
                                </p>
                            </div>

                            {/* WORKOVER SECTION */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <Wrench size={16} className="text-purple-500" /> Parâmetros de Workover
                                </h3>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    {/* 1. Well Context */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Poços Totais</label>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{params.wellsParams?.numWells || 16}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {params.wellsParams?.wellType === 'post' ? 'Pós-Sal' : 'Pré-Sal'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Complexidade</label>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {params.wellsParams?.complexity === 'low' ? 'Baixa' : 'Alta'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Modify Button (Moved) */}
                                    <button
                                        onClick={onNavigateToWells}
                                        className="w-full mb-6 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm"
                                    >
                                        Modificar configuração de poços (Ir para CAPEX)
                                    </button>

                                    {/* 3. Detailed Calculator */}
                                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            Cálculo do Custo de Workover - Parâmetros médios já calculados em função do tipo e complexidade do poço
                                        </h4>

                                        {/* Completion Technology Preset Selector */}
                                        <div className="mb-6 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                            <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide block mb-2">
                                                🔧 Tecnologia de Completação
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => {
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = 0.15;
                                                        const tesp = 90;
                                                        const costPerEvent = (params.workoverMobCost || 8) + ((params.workoverDuration || 20) * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({
                                                            ...prev,
                                                            workoverLambda: lambda,
                                                            workoverFailureProfile: 'wearout',
                                                            workoverTesp: tesp,
                                                            workoverCost: total
                                                        }));
                                                    }}
                                                    className="flex flex-col items-center justify-center p-3 rounded-lg text-[10px] font-medium transition-all border-2 bg-white dark:bg-slate-900 hover:shadow-md hover:scale-105 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                                                >
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Convencional</span>
                                                    <span className="text-[9px] text-slate-500">λ=0.15 • 90d</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = 0.05;
                                                        const tesp = 30;
                                                        const duration = 30;
                                                        const costPerEvent = (params.workoverMobCost || 8) + (duration * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({
                                                            ...prev,
                                                            workoverLambda: lambda,
                                                            workoverFailureProfile: 'wearout',
                                                            workoverTesp: tesp,
                                                            workoverDuration: duration,
                                                            workoverCost: total
                                                        }));
                                                    }}
                                                    className="flex flex-col items-center justify-center p-3 rounded-lg text-[10px] font-medium transition-all border-2 bg-white dark:bg-slate-900 hover:shadow-md hover:scale-105 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                                                >
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CI Hidráulica</span>
                                                    <span className="text-[9px] text-slate-500">λ=0.05 • 30d</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = 0.04;
                                                        const tesp = 30;
                                                        const duration = 30;
                                                        const costPerEvent = (params.workoverMobCost || 8) + (duration * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({
                                                            ...prev,
                                                            workoverLambda: lambda,
                                                            workoverFailureProfile: 'bathtub',
                                                            workoverTesp: tesp,
                                                            workoverDuration: duration,
                                                            workoverCost: total
                                                        }));
                                                    }}
                                                    className="flex flex-col items-center justify-center p-3 rounded-lg text-[10px] font-medium transition-all border-2 bg-white dark:bg-slate-900 hover:shadow-md hover:scale-105 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                                                >
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CI Elétrica</span>
                                                    <span className="text-[9px] text-slate-500">λ=0.04 • 30d</span>
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-2 text-center">
                                                Clique para aplicar valores típicos de cada tecnologia
                                            </p>

                                            {/* Explanatory Note for Conventional Completion */}
                                            {Math.abs((params.workoverLambda || 0.15) - 0.15) < 0.001 && (
                                                <div className="mt-4 p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Nota sobre Tecnologia de Completação (Convencional):</p>
                                                    <p className="leading-relaxed text-justify">
                                                        A taxa de falha de 0,15 eventos/ano utilizada para completação convencional é uma estimativa conservadora de 'Taxa de Intervenção com Sonda' (Rig-based Intervention Rate). Ela é baseada na agregação das taxas de falha mecânica de componentes de fundo (DHSV e Packers) conforme o OREDA Handbook (2015/2020), somada à frequência histórica de intervenções para gerenciamento de reservatório (isolamento de água e gás) em campos offshore análogos, conforme relatado em estudos da SPE (Society of Petroleum Engineers) sobre a Bacia de Campos e Mar do Norte.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Explanatory Note for Hydraulic CI */}
                                            {Math.abs((params.workoverLambda || 0.15) - 0.05) < 0.001 && (
                                                <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30 text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2">
                                                    <p className="font-bold text-blue-800 dark:text-blue-300 mb-2">Nota sobre Tecnologia de Completação (CI Hidráulica):</p>
                                                    <p className="leading-relaxed text-justify">
                                                        A taxa de intervenção de 0,05 eventos/ano para Completação Inteligente Hidráulica reflete a eliminação das intervenções para isolamento de água (Water Shutoff), que são realizadas remotamente pelas ICVs. O valor remanescente é atribuído à falha de componentes de segurança mandatórios (DHSV) e perda de integridade de packers. Estudos de confiabilidade de longo prazo (Survival Analysis), como Brouwer et al. (SPE 142247) e dados internos de operadoras do Pré-Sal, demonstram que sistemas hidráulicos passivos mantêm funcionalidade superior a 90% em janelas de 10 anos, e seus modos de falha raramente exigem mobilização imediata de sonda (Heavy Workover), permitindo operação degradada.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Explanatory Note for Electric CI */}
                                            {Math.abs((params.workoverLambda || 0.15) - 0.04) < 0.001 && (
                                                <div className="mt-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30 text-xs text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2">
                                                    <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-2">Nota sobre Tecnologia de Completação (CI Elétrica):</p>
                                                    <p className="leading-relaxed text-justify">
                                                        A taxa de falha de 0,04 a 0,05 eventos/ano para Completação Elétrica baseia-se na simplificação da arquitetura de fundo de poço (Multiplexação), onde múltiplos tubos hidráulicos são substituídos por um único cabo TEC (Tubing Encapsulated Cable), reduzindo estatisticamente os pontos de vazamento e falha mecânica durante a instalação. Referências como os padrões do consórcio AWES (Advanced Well Equipment Standards) e estudos de confiabilidade de eletrônica de alta temperatura (High-Temperature Electronics) apresentados na OTC, indicam que, após o período de 'mortalidade infantil' (burn-in), sistemas eletrônicos em ambiente de fundo de poço apresentam taxas de falha estocástica inferiores a sistemas eletromecânicos complexos, desde que operados dentro dos limites térmicos (&lt;150°C-175°C).
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Lambda */}
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500">Taxa de Falha (λ)</label>
                                                    <span className="text-xs font-bold text-purple-600">{params.workoverLambda || 0.15} eventos por ano</span>
                                                </div>
                                                <input
                                                    type="range" min="0.01" max="0.25" step="0.01"
                                                    value={params.workoverLambda || 0.15}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const costPerEvent = (params.workoverMobCost || 8) + ((params.workoverDuration || 20) * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * val * costPerEvent * 1000000;
                                                        setParams(prev => ({ ...prev, workoverLambda: val, workoverCost: total }));
                                                    }}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                />
                                            </div>

                                            {/* Failure Profile */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-2">Perfil de Falha</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleChange('workoverFailureProfile', 'wearout')}
                                                        className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium transition-all ${(params.workoverFailureProfile || 'wearout') === 'wearout'
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        Desgaste
                                                    </button>
                                                    <button
                                                        onClick={() => handleChange('workoverFailureProfile', 'bathtub')}
                                                        className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium transition-all ${params.workoverFailureProfile === 'bathtub'
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        Banheira
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                                                    {(params.workoverFailureProfile || 'wearout') === 'wearout'
                                                        ? 'Taxa aumenta com o envelhecimento dos poços'
                                                        : 'Taxa alta no início, baixa no meio, alta no final'}
                                                </p>
                                            </div>

                                            {/* Mob Cost */}
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500">Custo Mobilização</label>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {params.workoverMobCost || 8} MM</span>
                                                </div>
                                                <input
                                                    type="range" min="1" max="20" step="0.5"
                                                    value={params.workoverMobCost || 8}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = params.workoverLambda || 0.15;
                                                        const costPerEvent = val + ((params.workoverDuration || 20) * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({ ...prev, workoverMobCost: val, workoverCost: total }));
                                                    }}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                                                />
                                            </div>

                                            {/* Duration */}
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500">Duração Intervenção</label>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{params.workoverDuration || 20} dias</span>
                                                </div>
                                                <input
                                                    type="range" min="5" max="60" step="1"
                                                    value={params.workoverDuration || 20}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = params.workoverLambda || 0.15;
                                                        const mob = params.workoverMobCost || 8;
                                                        const costPerEvent = mob + (val * (params.workoverDailyRate || 800) / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({ ...prev, workoverDuration: val, workoverCost: total }));
                                                    }}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                                                />
                                            </div>

                                            {/* Daily Rate */}
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500">Taxa Diária Recurso</label>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$ {params.workoverDailyRate || 800} k/dia</span>
                                                </div>
                                                <input
                                                    type="range" min="200" max="1500" step="50"
                                                    value={params.workoverDailyRate || 800}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const numWells = params.wellsParams?.numWells || 16;
                                                        const lambda = params.workoverLambda || 0.15;
                                                        const mob = params.workoverMobCost || 8;
                                                        const costPerEvent = mob + ((params.workoverDuration || 20) * val / 1000);
                                                        const total = numWells * lambda * costPerEvent * 1000000;
                                                        setParams(prev => ({ ...prev, workoverDailyRate: val, workoverCost: total }));
                                                    }}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Calculated Result Display */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Custo por Poço:</span>
                                                    <span className="font-mono">
                                                        {((params.workoverLambda || 0.15) * ((params.workoverMobCost || 8) + ((params.workoverDuration || 20) * (params.workoverDailyRate || 800) / 1000))).toFixed(1)} MM/ano
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                                                        Total ({params.wellsParams?.numWells || 16} poços)
                                                    </span>
                                                    <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                                                        {formatMillionsNoDecimals(params.workoverCost)}/ano
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pprod Section (Loss of Production) */}
                                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                                <Droplet size={14} className="text-red-500" />
                                                Perda de Produção (Pprod)
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                {/* Tesp Input */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-[10px] font-medium text-slate-500">Tempo de Espera</label>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{params.workoverTesp || 90} dias</span>
                                                    </div>
                                                    <input
                                                        type="range" min="30" max="180" step="5"
                                                        value={params.workoverTesp || 90}
                                                        onChange={(e) => handleChange('workoverTesp', Number(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                                                    />
                                                </div>

                                                {/* Qwell Display */}
                                                <div>
                                                    <label className="text-[10px] font-medium text-slate-500 block mb-1">Produtividade do Poço</label>
                                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                        {(() => {
                                                            const peak = params.peakProduction || 150; // kbpd
                                                            const producers = params.wellsParams?.producers || (params.wellsParams?.numWells ? Math.ceil(params.wellsParams.numWells / 2) : 8);
                                                            const qWell = (peak * 1000) / producers;
                                                            return Math.round(qWell).toLocaleString();
                                                        })()} bpd
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Result Display */}
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>Perda de Produção por Poço:</span>
                                                        <span className="font-mono text-red-600 dark:text-red-400">
                                                            {Math.round(productionLossStats.lossPerWell).toLocaleString()} bbl/ano
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                                            Perda de Produção Total ({params.wellsParams?.numWells || 16} Poços Prod)
                                                        </span>
                                                        <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                                            {productionLossStats.totalLoss.toFixed(2)} MM bbl/ano
                                                        </span>
                                                    </div>
                                                    {/* NPV Loss Card */}
                                                    <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-3 rounded-lg border-2 border-orange-200 dark:border-orange-800/50 shadow-sm">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                                                                💸 Impacto no VPL
                                                            </span>
                                                            <span className="text-xs font-bold text-orange-800 dark:text-orange-300 mt-0.5">
                                                                Perda de Valor Presente Líquido
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-base font-bold text-orange-700 dark:text-orange-400">
                                                                -$ {productionLossStats.npvLoss.toFixed(1)} MM
                                                            </span>
                                                            <span className="text-[9px] text-orange-600 dark:text-orange-500">
                                                                TMA: {params.tma || 10}% • Gov Take: {productionLossStats.govTakeRate.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                                        <p><span className="font-bold text-slate-700 dark:text-slate-200">Premissas e Referências de Mercado:</span></p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                                            <li>
                                                <strong>OPEX Fixo:</strong> Predominante em projetos offshore (~80-90% do total). Inclui aluguel de sonda/FPSO (se afretado), logística (barcos, helicópteros), pessoal embarcado e manutenção de rotina. Modelo segue estimativa baseada em capacidade instalada.
                                            </li>
                                            <li>
                                                <strong>OPEX Variável:</strong> Custos diretos de consumíveis (produtos químicos, energia, tratamento de água) proporcionais ao volume produzido. Tende a aumentar com o BSW (água) no fim da vida útil.
                                            </li>
                                            <li>
                                                <strong>Workover:</strong> Provisão anualizada para grandes intervenções em poços (troca de BCS, estimulação) e reparos submarinos.
                                            </li>
                                        </ul>
                                        <p className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 italic">
                                            Fontes: Planos Estratégicos Petrobras, benchmarks da Rystad Energy e relatórios técnicos da Wood Mackenzie.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- DECOMMISSIONING (ABEX) SECTION --- */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Anchor size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Descomissionamento (ABEX)</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Custos de abandono ao final da vida útil.</p>
                        </div>
                    </div>

                    {/* Mode Switch ABEX */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex mb-6">
                        <button
                            onClick={() => handleChange('abexMode', 'simple')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${params.abexMode === 'simple' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                        >
                            Simples (%)
                        </button>
                        <button
                            onClick={() => handleChange('abexMode', 'detailed')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${params.abexMode === 'detailed' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                        >
                            Detalhado
                        </button>
                    </div>

                    {params.abexMode === 'simple' ? (
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                <span className="flex items-center gap-2">Taxa Global (% do CAPEX Total)</span>
                                <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">{params.abexSimpleRate || 15}%</span>
                            </label>
                            <input
                                type="range" min="5" max="30" step="1"
                                value={params.abexSimpleRate || 15}
                                onChange={(e) => handleChange('abexSimpleRate', Number(e.target.value))}
                                className="w-full accent-amber-600"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Estima o ABEX como uma porcentagem fixa do CAPEX Total. Padrão de mercado: 15%.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 1. Wells P&A */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2">1. Poços (P&A unitário)</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                                        {formatMillionsNoDecimals(params.abexPerWell || 25000000)}/poço
                                    </span>
                                </label>
                                <input
                                    type="range" min="5000000" max="100000000" step="1000000"
                                    value={params.abexPerWell || 25000000}
                                    onChange={(e) => handleChange('abexPerWell', Number(e.target.value))}
                                    className="w-full accent-amber-600"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Base: {params.wellsParams?.numWells || 16} Poços</span>
                                    <span>Total: {formatMillionsNoDecimals((params.wellsParams?.numWells || 16) * (params.abexPerWell || 25000000))}</span>
                                </div>
                            </div>

                            {/* 2. Subsea */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2">2. Remoção Subsea (% CAPEX Subsea)</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                                        {params.abexSubseaPct || 25}%
                                    </span>
                                </label>
                                <input
                                    type="range" min="10" max="50" step="1"
                                    value={params.abexSubseaPct || 25}
                                    onChange={(e) => handleChange('abexSubseaPct', Number(e.target.value))}
                                    className="w-full accent-amber-600"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Custo de recolhimento de linhas e equipamentos submarinos.
                                </p>
                            </div>

                            {/* 3. Platform */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                    <span className="flex items-center gap-2">3. Plataforma (Limpeza/Rebocagem)</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                                        {formatMillionsNoDecimals(params.abexPlatform || 150000000)}
                                    </span>
                                </label>
                                <input
                                    type="range" min="0" max="500000000" step="10000000"
                                    value={params.abexPlatform || 150000000}
                                    onChange={(e) => handleChange('abexPlatform', Number(e.target.value))}
                                    className="w-full accent-amber-600"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Custo fixo lump-sum para desconexão, limpeza e destinação da unidade.
                                </p>
                            </div>

                            {/* Total Summary for Detailed Mode */}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-lg">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Custo Total de Descomissionamento</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Soma de Poços, Subsea e Plataforma</p>
                                </div>
                                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {formatMillionsNoDecimals(
                                        ((params.wellsParams?.numWells || 16) * (params.abexPerWell || 25000000)) +
                                        ((params.totalCapex || 6000000000) * ((params.capexSplit?.subsea || 20) / 100) * ((params.abexSubseaPct || 25) / 100)) +
                                        (params.abexPlatform || 150000000)
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

            </div>


            {/* RIGHT COLUMN: CHART */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px]">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <BarChart2 size={20} className="text-purple-600 dark:text-purple-400" />
                        Receita Bruta x Custos Operacionais
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Comparativo de fluxo de caixa operacional.</p>

                    <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart data={React.useMemo(() => {
                            const data = generateProjectData(params).yearlyData;

                            // Calculate time-dependent loss factor for each year
                            // This must match the calculation in calculations.js
                            return data.filter(d => d.revenue > 0 || d.opex < 0).map((d, index) => {
                                const totalRevenue = d.revenue / 1000000;
                                let lossFactor = 0;

                                // Only calculate loss if in DETAILED OPEX mode
                                if (params.opexMode === 'detailed' && params.workoverLambda && params.workoverTesp) {
                                    const lambdaAvg = params.workoverLambda;
                                    const waitDays = params.workoverTesp;
                                    const wDuration = params.workoverDuration || 20;
                                    const projectDuration = params.projectDuration || 30;
                                    const failureProfile = params.workoverFailureProfile || 'wearout';

                                    // Calculate year index (same as in calculations.js)
                                    const year = d.year;
                                    let lambda;

                                    if (failureProfile === 'bathtub') {
                                        // Bathtub curve: High at start, low in middle, high at end
                                        const normalizedTime = year / Math.max(projectDuration - 1, 1);
                                        const centered = normalizedTime - 0.5;

                                        const minLambda = lambdaAvg * 0.5;
                                        const maxLambda = lambdaAvg * 2.0;
                                        const a = (maxLambda - minLambda) * 4;
                                        const b = minLambda;

                                        lambda = a * centered * centered + b;
                                        lambda = Math.max(0, Math.min(maxLambda, lambda));
                                    } else {
                                        // Wearout (default): Linear growth model
                                        const growthFactor = 1.5;
                                        const normalizedTime = year / Math.max(projectDuration - 1, 1);
                                        const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
                                        lambda = Math.max(0, lambdaAvg * multiplier);
                                    }

                                    // Loss factor for THIS specific year
                                    const daysLostPerYear = lambda * waitDays;
                                    lossFactor = Math.min(1, Math.max(0, daysLostPerYear / 365));
                                }

                                const lostRevenue = totalRevenue * lossFactor;
                                const realizedRevenue = totalRevenue - lostRevenue;

                                return {
                                    year: d.year,
                                    realizedRevenue,
                                    lostRevenue,
                                    totalRevenue,
                                    opex: Math.abs(d.opex) / 1000000
                                };
                            });
                        }, [params])}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.3} />
                            <XAxis
                                dataKey="year"
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `$${val}M`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value, name) => {
                                    if (name === 'Receita Realizada') return [`$${value.toFixed(0)} MM`, name];
                                    if (name === 'Perda de Produção') return [`$${value.toFixed(0)} MM`, name];
                                    return [`$${value.toFixed(0)} MM`, name];
                                }}
                                labelFormatter={(label) => `Ano ${label}`}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                            {/* Stacked Revenue Areas */}
                            <Area
                                type="monotone"
                                dataKey="realizedRevenue"
                                name="Receita Realizada"
                                stackId="1"
                                fill="#10b981"
                                fillOpacity={0.6} // More opaque to distinguish
                                stroke="#10b981"
                                strokeWidth={0}
                            />
                            <Area
                                type="monotone"
                                dataKey="lostRevenue"
                                name="Perda de Produção"
                                stackId="1"
                                fill="#ef4444" // Red for loss
                                fillOpacity={0.6}
                                stroke="#ef4444"
                                strokeWidth={0}
                            />

                            {/* Opex Line (Overlay) - Changed from Area to Line for clarity or keep as area? 
                                User asked for "Revenue vs OPEX". 
                                Previous was Area. Let's keep Area but separate stack or no stack.
                                Previous OPEX was separate Area (no stackId). 
                                Let's keep it that way but make it semi-transparent on top.
                            */}
                            <Area
                                type="monotone"
                                dataKey="opex"
                                name="Custos Operacionais"
                                fill="#8b5cf6"
                                fillOpacity={0.2}
                                stroke="#8b5cf6"
                                strokeWidth={2}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* FAILURE RATE EVOLUTION CHART - Collapsible */}
                {params.opexMode === 'detailed' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Evolução da Taxa de Falha e Perda de Produção
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowFailureChart(!showFailureChart)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                            >
                                {showFailureChart ? (
                                    <>
                                        <EyeOff size={16} />
                                        Ocultar Gráfico
                                    </>
                                ) : (
                                    <>
                                        <Eye size={16} />
                                        Visualizar Gráfico
                                    </>
                                )}
                            </button>
                        </div>

                        {showFailureChart && (
                            <>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Visualização da taxa de falha (λ) e perda de produção ao longo do tempo,
                                    seguindo o perfil <strong>{(params.workoverFailureProfile || 'wearout') === 'wearout' ? 'Desgaste' : 'Banheira'}</strong>.
                                </p>

                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={failureChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.3} />
                                            <XAxis
                                                dataKey="year"
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                label={{ value: 'Ano do Projeto', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(val) => `${val.toFixed(1)}%`}
                                                label={{ value: 'Taxa de Falha (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(val) => `${val.toFixed(2)}`}
                                                label={{ value: 'Perda de Produção (MM bbl)', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value, name) => {
                                                    if (name === 'Taxa de Falha') return [`${value.toFixed(2)}%`, name];
                                                    if (name === 'Taxa Média') return [`${value.toFixed(2)}%`, name];
                                                    if (name === 'Perda % Eficiência') return [`${value.toFixed(2)}%`, name];
                                                    if (name === 'Perda de Produção') return [`${value.toFixed(3)} MM bbl`, name];
                                                    return [value, name];
                                                }}
                                                labelFormatter={(label) => `Ano ${label}`}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                                            {/* Reference line for average lambda */}
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="lambdaAvg"
                                                name="Taxa Média"
                                                stroke="#94a3b8"
                                                strokeWidth={1}
                                                strokeDasharray="5 5"
                                                dot={false}
                                            />

                                            {/* Actual lambda over time */}
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="lambda"
                                                name="Taxa de Falha"
                                                stroke="#f97316"
                                                strokeWidth={3}
                                                dot={false}
                                            />

                                            {/* Production loss area */}
                                            <Area
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="productionLossMMbbl"
                                                name="Perda de Produção"
                                                fill="#ef4444"
                                                fillOpacity={0.3}
                                                stroke="#ef4444"
                                                strokeWidth={2}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};

export default OpexParameters;
