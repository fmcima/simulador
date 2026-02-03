import React from 'react';
import { DollarSign, Percent, Wrench, Activity, Info, Droplet, BarChart2 } from 'lucide-react';
import { formatCurrency, formatMillionsNoDecimals, generateProjectData } from '../utils/calculations';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OpexParameters = ({ params, setParams, onNavigateToWells }) => {

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
                            Simplificado (% da Receita)
                        </button>
                        <button
                            onClick={() => handleChange('opexMode', 'detailed')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${params.opexMode === 'detailed' ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                        >
                            Detalhado (Fixo + Variável)
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Lambda */}
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-medium text-slate-500">Taxa de Falha (λ)</label>
                                                    <span className="text-xs font-bold text-purple-600">{params.workoverLambda || 0.15} eventos por ano</span>
                                                </div>
                                                <input
                                                    type="range" min="0.05" max="0.5" step="0.01"
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
                                                            {(() => {
                                                                const lambda = params.workoverLambda || 0.15;
                                                                const dur = params.workoverDuration || 20;
                                                                const tesp = params.workoverTesp || 90;

                                                                const peak = params.peakProduction || 150;
                                                                const producers = params.wellsParams?.producers || (params.wellsParams?.numWells ? Math.ceil(params.wellsParams.numWells / 2) : 8);
                                                                const qWell = (peak * 1000) / producers;

                                                                const pProdBbl = lambda * (tesp + dur) * qWell;
                                                                return Math.round(pProdBbl).toLocaleString() + ' bbl/ano';
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                                            Perda de Produção Total ({params.wellsParams?.producers || (params.wellsParams?.numWells ? Math.ceil(params.wellsParams.numWells / 2) : 8)} Poços Prod)
                                                        </span>
                                                        <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                                            {(() => {
                                                                const lambda = params.workoverLambda || 0.15;
                                                                const dur = params.workoverDuration || 20;
                                                                const tesp = params.workoverTesp || 90;

                                                                const peak = params.peakProduction || 150;
                                                                const producers = params.wellsParams?.producers || (params.wellsParams?.numWells ? Math.ceil(params.wellsParams.numWells / 2) : 8);
                                                                const qWell = (peak * 1000) / producers;

                                                                const pProdBbl = lambda * (tesp + dur) * qWell;
                                                                const totalMM = (pProdBbl * producers) / 1000000;
                                                                return totalMM.toFixed(2) + ' MM bbl/ano';
                                                            })()}
                                                        </span>
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
            </div>
        </div>
    );
};

export default OpexParameters;
