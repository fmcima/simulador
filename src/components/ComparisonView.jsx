import React, { useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import { ArrowRight, Copy, Split, Settings } from 'lucide-react';
import { formatCurrency, formatBillions } from '../utils/calculations';
import KPICard from './KPICard';
import ProjectInputForm from './ProjectInputForm';

const ComparisonView = ({ projectA, setProjectA, projectB, setProjectB, resultsA, resultsB, copyAToB }) => {
    const { theme } = useTheme();

    // Dados combinados para o gráfico
    const comparisonData = useMemo(() => {
        return resultsA.yearlyData.map((item, index) => ({
            year: item.year,
            accumulatedA: item.accumulatedCashFlow,
            accumulatedB: resultsB.yearlyData[index]?.accumulatedCashFlow || 0,
            freeFlowA: item.freeCashFlow,
            freeFlowB: resultsB.yearlyData[index]?.freeCashFlow || 0
        }));
    }, [resultsA, resultsB]);

    const metrics = [
        { label: 'VPL (NPV)', key: 'vpl', fmt: formatBillions, diffGood: 'higher' },
        { label: 'TIR (IRR)', key: 'tir', fmt: (v) => `${v?.toFixed(2)}%`, diffGood: 'higher' },
        { label: 'VPL / IA', key: 'vpl_ia', fmt: (v) => `${v?.toFixed(2)}x`, diffGood: 'higher' },
        { label: 'Payback', key: 'payback', fmt: (v) => `${v?.toFixed(1)} anos`, diffGood: 'lower' },
        { label: 'Brent Eq.', key: 'breakevenBrent', fmt: (v) => `$${v?.toFixed(2)}`, diffGood: 'lower' }
    ];

    const getDiffColor = (valA, valB, type) => {
        if (!valA || !valB) return 'text-slate-400 dark:text-slate-500';
        if (valA === valB) return 'text-slate-400 dark:text-slate-500';
        const isBetter = type === 'higher' ? valB > valA : valB < valA;
        return isBetter ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-500';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Esquerda: Editor do Cenário A */}
            <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                    <div className="text-blue-800 dark:text-blue-200 text-sm font-bold flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Parâmetros Cenário A
                    </div>
                </div>

                <div className="opacity-90">
                    <ProjectInputForm
                        params={projectA}
                        setParams={setProjectA}
                        label="Editor Cenário A"
                        colorClass="accent-blue-600"
                    />
                </div>
            </div>

            {/* Centro: Gráficos e Tabelas */}
            <div className="lg:col-span-6 space-y-6">

                {/* Comparativo Visual */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Split className="w-4 h-4 text-blue-600" /> Comparativo de Fluxo de Caixa Acumulado
                    </h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="year" fontSize={10} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(v) => `$${(v / 1000000000).toFixed(1)}B`} fontSize={10} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={(v) => formatCurrency(v)}
                                labelFormatter={(l) => `Ano ${l}`}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                                    color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', color: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <ReferenceLine y={0} stroke={theme === 'dark' ? '#475569' : '#cbd5e1'} />
                            <Line type="monotone" dataKey="accumulatedA" name="Cenário A" stroke="#2563eb" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="accumulatedB" name="Cenário B" stroke="#f59e0b" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tabela Comparativa */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                            <tr>
                                <th className="p-3">Indicador</th>
                                <th className="p-3 text-blue-700">Cenário A</th>
                                <th className="p-3 text-orange-600">Cenário B</th>
                                <th className="p-3">Dif (B-A)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {metrics.map((m, i) => {
                                const valA = resultsA.metrics[m.key];
                                const valB = resultsB.metrics[m.key];
                                const diff = valB && valA ? valB - valA : 0;

                                return (
                                    <tr key={m.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{m.label}</td>
                                        <td className="p-3 font-bold text-blue-700 dark:text-blue-400">{m.fmt(valA)}</td>
                                        <td className={`p-3 font-bold ${getDiffColor(valA, valB, m.diffGood)}`}>
                                            {m.fmt(valB)}
                                        </td>
                                        <td className="p-3 text-slate-500 dark:text-slate-400">
                                            {m.key === 'vpl' ? formatBillions(diff) :
                                                m.key === 'payback' ? diff.toFixed(1) :
                                                    diff.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* Direita: Editor do Cenário B */}
            <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-100 dark:border-orange-900">
                    <div className="text-orange-800 dark:text-orange-200 text-sm font-bold flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Parâmetros Cenário B
                    </div>
                    <button
                        onClick={copyAToB}
                        className="text-xs bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900 px-3 py-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-1"
                        title="Copiar todos os parâmetros de A para B"
                    >
                        <Copy size={12} /> Copiar de A
                    </button>
                </div>

                <div className="opacity-90">
                    <ProjectInputForm
                        params={projectB}
                        setParams={setProjectB}
                        label="Editor Cenário B"
                        colorClass="accent-orange-500"
                    />
                </div>
            </div>

        </div>
    );
};

export default ComparisonView;
