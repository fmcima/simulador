import React from 'react';
import { DollarSign, Percent, Wrench, Activity } from 'lucide-react';
import { formatCurrency, formatMillionsNoDecimals } from '../utils/calculations';

const OpexParameters = ({ params, setParams }) => {

    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    // Calculate typical OPEX values based on unit capacity (peakProduction)
    const capacity = params.peakProduction || 150; // kbpd
    const typicalOpexFixed = Math.round(capacity * 0.6 * 1000000); // ~$0.6M per kbpd/year
    const typicalOpexVariable = 4; // $4/bbl typical
    const typicalWorkover = Math.round(capacity * 0.06 * 1000000); // ~$60k per kbpd/year

    const suggestTypicalValues = () => {
        setParams(prev => ({
            ...prev,
            opexFixed: typicalOpexFixed,
            opexVariable: typicalOpexVariable,
            workoverCost: typicalWorkover
        }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                        {/* WORKOVER */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                <span className="flex items-center gap-2"><Wrench size={16} className="text-slate-400 dark:text-slate-500" /> Provisão para Workover (Anual)</span>
                                <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded">{formatMillionsNoDecimals(params.workoverCost)}/ano</span>
                            </label>
                            <input
                                type="range" min="0" max="100000000" step="5000000"
                                value={params.workoverCost}
                                onChange={(e) => handleChange('workoverCost', Number(e.target.value))}
                                className="w-full accent-purple-600"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Provisão anual média para intervenções pesadas em poços e reparos submarinos.
                            </p>
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
                )}
            </div>
        </div >
    );
};

export default OpexParameters;
