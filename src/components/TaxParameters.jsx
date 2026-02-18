import React from 'react';
import { Ship, Landmark, Info, Activity } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

const TaxParameters = ({ params, setParams }) => {
    const handleChange = (field, value) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    const handleChangeCapexSplit = (key, value) => {
        setParams(prev => ({
            ...prev,
            capexSplit: { ...prev.capexSplit, [key]: value }
        }));
    };

    const handleChangeDepreciationConfig = (category, field, value) => {
        setParams(prev => ({
            ...prev,
            depreciationConfig: {
                ...prev.depreciationConfig,
                [category]: {
                    ...prev.depreciationConfig[category],
                    [field]: value
                }
            }
        }));
    };

    const handleOwnershipChange = (newMode) => {
        setParams(prev => {
            if (prev.platformOwnership === newMode) return prev;

            let newTotalCapex = prev.totalCapex;
            let newSplit = { ...prev.capexSplit };
            let newCharterPV = prev.charterPV; // Default to prev unless changed

            if (newMode === 'chartered') {
                // Switching Owned -> Chartered
                // Objetivo: Manter os valores ABSOLUTOS de Poços e Subsea.
                // 1. Calcular valores absolutos atuais
                const currentWellsAbs = prev.totalCapex * (prev.capexSplit.wells / 100);
                const currentSubseaAbs = prev.totalCapex * (prev.capexSplit.subsea / 100);
                const currentPlatformAbs = prev.totalCapex * (prev.capexSplit.platform / 100);

                // Use current FPSO Capex as initial Charter PV
                if (currentPlatformAbs > 0) newCharterPV = currentPlatformAbs;

                // 2. Novo Total é a soma de Poços + Subsea (Plataforma vira 0)
                newTotalCapex = currentWellsAbs + currentSubseaAbs;

                // 3. Recalcular percentuais para somar 100% do novo total
                if (newTotalCapex > 0) {
                    newSplit.platform = 0;
                    newSplit.wells = (currentWellsAbs / newTotalCapex) * 100;
                    newSplit.subsea = (currentSubseaAbs / newTotalCapex) * 100;
                } else {
                    // Fallback se tudo for zero
                    newSplit = { platform: 0, wells: 66.6, subsea: 33.4 };
                }

            } else {
                // Switching Chartered -> Owned
                // Objetivo: Restaurar a Plataforma usando o valor real configurado na aba de FPSO.

                // 1. Obter Custo da Plataforma (do Módulo de FPSO)
                let platformCost = 0;
                if (prev.fpsoParams) {
                    // Tenta usar o total calculado persistido (que vem do App.jsx via handleUpdateCapex)
                    // Se não existir (legado ou primeira render), tenta simpleTotal ou fallback.
                    const savedTotal = prev.fpsoParams.calculatedTotal || prev.fpsoParams.simpleTotal;

                    if (savedTotal) {
                        platformCost = savedTotal * 1000000;
                    } else {
                        platformCost = 2500000000;
                    }
                } else {
                    platformCost = 2500000000; // Default fallback $2.5B
                }

                // Recupera os valores absolutos de Poços e Subsea (que são a TOTALIDADE do Capex atual no modo Chartered)
                const currentWellsAbs = prev.totalCapex * (prev.capexSplit.wells / 100);
                const currentSubseaAbs = prev.totalCapex * (prev.capexSplit.subsea / 100);

                // Novo Total = P + W + S
                newTotalCapex = platformCost + currentWellsAbs + currentSubseaAbs;

                // Recalcular percentuais
                if (newTotalCapex > 0) {
                    newSplit.platform = (platformCost / newTotalCapex) * 100;
                    newSplit.wells = (currentWellsAbs / newTotalCapex) * 100;
                    newSplit.subsea = (currentSubseaAbs / newTotalCapex) * 100;
                }
            }

            return {
                ...prev,
                platformOwnership: newMode,
                totalCapex: newTotalCapex,
                capexSplit: newSplit,
                charterPV: newCharterPV
            };
        });
    };

    const applyTaxRegimeTemplate = (type) => {
        let updates = {};
        if (type === 'Marlim' || type === 'Roncador') updates = { taxRegime: 'concession', royaltiesRate: 10, specialParticipationRate: 35 };
        if (type === 'Jubarte' || type === 'Tupi') updates = { taxRegime: 'concession', royaltiesRate: 10, specialParticipationRate: 25 };
        if (type === 'Mero' || type === 'Buzios') updates = { taxRegime: 'sharing', royaltiesRate: 15, costOilCap: 50, profitOilGovShare: 45 };
        if (type === 'Sepia' || type === 'Itapu') updates = { taxRegime: 'sharing', royaltiesRate: 15, costOilCap: 50, profitOilGovShare: 30 };

        setParams(prev => ({ ...prev, ...updates }));
    };

    // Helper: Calculation of Effective Tax Rate (Weighted)
    const calculateEffectiveRate = () => {
        // Normalização do repetroRatio (caso venha legado como número ou objeto)
        const repetro = typeof params.repetroRatio === 'object' ? params.repetroRatio : { platform: params.repetroRatio, wells: params.repetroRatio, subsea: params.repetroRatio };

        const splitTotal = params.capexSplit.platform + params.capexSplit.wells + params.capexSplit.subsea;
        const normPlatform = splitTotal > 0 ? params.capexSplit.platform / splitTotal : 0;
        const normWells = splitTotal > 0 ? params.capexSplit.wells / splitTotal : 0;
        const normSubsea = splitTotal > 0 ? params.capexSplit.subsea / splitTotal : 0;

        const ratePlatform = normPlatform * (1 - repetro.platform / 100) * (params.capexTaxRate / 100);
        const rateWells = normWells * (1 - repetro.wells / 100) * (params.capexTaxRate / 100);
        const rateSubsea = normSubsea * (1 - repetro.subsea / 100) * (params.capexTaxRate / 100);

        return ((ratePlatform + rateWells + rateSubsea) * 100).toFixed(2);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
                {/* NOVO: CARD DE CONTRATAÇÃO & INCENTIVOS */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Ship className="w-5 h-5 text-blue-600" /> Contratação & Incentivos
                    </h2>

                    <div className="space-y-6">
                        {/* Platform Ownership */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Modelo de Contratação (Plataforma)</label>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <button
                                    onClick={() => handleOwnershipChange('owned')}
                                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all ${params.platformOwnership === 'owned' ? 'bg-white dark:bg-slate-900 text-blue-700 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                                >
                                    Própria (CAPEX)
                                </button>
                                <button
                                    onClick={() => handleOwnershipChange('chartered')}
                                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all ${params.platformOwnership === 'chartered' ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                                >
                                    Afretada (OPEX)
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                                {params.platformOwnership === 'owned'
                                    ? 'Investimento inicial (CAPEX) com depreciação e benefício fiscal.'
                                    : 'Sem investimento inicial. Custo diluído como taxa diária (OPEX).'}
                            </p>
                        </div>

                        {/* Inputs Afretamento */}
                        {params.platformOwnership === 'chartered' && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-100 dark:border-orange-900 animate-in fade-in slide-in-from-top-1">
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-orange-800 dark:text-orange-200 block mb-1">Valor Presente do Afretamento (PV)</label>
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded border border-orange-200 dark:border-orange-900 p-1">
                                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 pl-1">$</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={params.charterPV / 1000000000}
                                            onChange={(e) => handleChange('charterPV', Number(e.target.value) * 1000000000)}
                                            className="w-full text-sm p-1 outline-none text-orange-800 dark:text-orange-200 font-bold bg-transparent"
                                        />
                                        <span className="text-xs font-medium text-orange-500 dark:text-orange-400 pr-2">Bi</span>
                                    </div>
                                    <div className="text-[10px] text-orange-500 dark:text-orange-400 mt-1 text-right">
                                        Valor Total: {formatCurrency(params.charterPV)}
                                    </div>
                                </div>

                                {/* Charter Split */}
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1 block">Split Contratual (Afretamento vs Serviços)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Afretamento (Isento)</span>
                                            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2">
                                                <input
                                                    type="number"
                                                    value={params.charterSplit?.charter || 85}
                                                    onChange={(e) => {
                                                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                                        setParams(prev => ({ ...prev, charterSplit: { charter: val, service: 100 - val } }));
                                                    }}
                                                    className="w-full py-1 text-xs font-bold outline-none text-orange-700 dark:text-orange-400 bg-transparent"
                                                />
                                                <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Serviços (Tributado)</span>
                                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-2">
                                                <span className="w-full py-1 text-xs font-bold text-slate-600 dark:text-slate-400 block">
                                                    {params.charterSplit?.service || 15}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Tax Rate */}
                                <div>
                                    <label className="text-xs font-medium text-orange-800 dark:text-orange-200 flex justify-between">
                                        <span>Impostos sobre Serviços (PIS/COFINS/ISS)</span>
                                        <span className="font-bold">{params.serviceTaxRate || 14.25}%</span>
                                    </label>
                                    <input
                                        type="range" min="0" max="30" step="0.25"
                                        value={params.serviceTaxRate || 14.25}
                                        onChange={(e) => handleChange('serviceTaxRate', Number(e.target.value))}
                                        className="w-full accent-orange-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Repetro Slider - DETALHADO */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Repetro-Sped (% de Benefício)</h4>

                            {['platform', 'wells', 'subsea'].map(key => {
                                const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';
                                const currentVal = typeof params.repetroRatio === 'object' ? params.repetroRatio[key] : params.repetroRatio;

                                const tooltips = {
                                    platform: "O casco, módulos, equipamentos de topo. Altíssima aderência ao Repetro. Basicamente paga-se o ICMS reduzido (RJ).",
                                    wells: "Revestimentos (Casing), Coluna de Produção (Tubing), Cabeça de Poço, Brocas. Baixa aderência ao Repetro sobre o total. O peso dos combustíveis e serviços eleva a média tributável.",
                                    subsea: "Linhas flexíveis, umbilicais, risers, árvores de natal (ANM), manifolds. A Instalação (navios PLSV) é cara e tributada."
                                };

                                return (
                                    <div key={key} className={isDisabled ? 'opacity-50' : ''}>
                                        <div className="flex justify-between text-xs mb-1 items-center">
                                            <div className="flex items-center gap-1.5 group relative">
                                                <span className="capitalize cursor-help border-b border-dotted border-slate-300 dark:border-slate-600">
                                                    {key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}
                                                </span>
                                                <Info size={12} className="text-slate-400 hover:text-blue-500 transition-colors" />

                                                {/* Tooltip Nativo Simplificado ou Customizado */}
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none">
                                                    {tooltips[key]}
                                                    <div className="absolute bottom-[-4px] left-2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                                </div>
                                            </div>
                                            <span className="font-bold">{isDisabled ? '-' : `${currentVal}%`}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="5"
                                            value={isDisabled ? 0 : currentVal}
                                            disabled={isDisabled}
                                            onChange={(e) => {
                                                const newVal = Number(e.target.value);
                                                setParams(prev => {
                                                    const oldRepetro = typeof prev.repetroRatio === 'object' ? prev.repetroRatio : { platform: prev.repetroRatio, wells: prev.repetroRatio, subsea: prev.repetroRatio };
                                                    return {
                                                        ...prev,
                                                        repetroRatio: { ...oldRepetro, [key]: newVal }
                                                    };
                                                });
                                            }}
                                            className={`w-full ${key === 'platform' ? 'accent-blue-600' : key === 'wells' ? 'accent-emerald-600' : 'accent-purple-600'}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Exibição da Taxa Efetiva Global */}
                        <div className="animate-in fade-in slide-in-from-top-2 mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                                Considerando alíquota base padrão de <strong>{params.capexTaxRate}%</strong> sobre a parcela sem benefício.
                                <div className="mt-1 font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-700">
                                    Taxa Efetiva Ponderada: <strong>{calculateEffectiveRate()}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-blue-600" /> Configuração do Regime
                    </h2>

                    <div className="space-y-6">
                        {/* Seleção de Regime */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Regime Tributário</label>
                            <div className="flex flex-col gap-2">
                                {['concession', 'sharing', 'transfer_rights'].map(regime => (
                                    <button
                                        key={regime}
                                        onClick={() => handleChange('taxRegime', regime)}
                                        className={`p-3 text-left rounded-lg border transition-all ${params.taxRegime === regime ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800'}`}
                                    >
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                            {regime === 'concession' ? 'Regime de Concessão' : regime === 'sharing' ? 'Regime de Partilha' : 'Cessão Onerosa'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {regime === 'concession' ? 'Royalties + Part. Especial + IR/CSLL' :
                                                regime === 'sharing' ? 'Royalties + Custo em Óleo + Excedente União' :
                                                    'Royalties + IR/CSLL (Simples)'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inputs Específicos do Regime */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
                            <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">Parâmetros do Regime</h4>

                            {/* Royalties - Comum a todos */}
                            <div>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Alíquota de Royalties (%)</label>
                                <div className="flex gap-2">
                                    {[5, 10, 15].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => handleChange('royaltiesRate', rate)}
                                            className={`flex-1 py-1 text-xs font-bold rounded border ${params.royaltiesRate === rate ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            {rate}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs Exclusivos de Concessão */}
                            {params.taxRegime === 'concession' && (
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block flex justify-between">
                                        <span>Participação Especial (Média Efetiva)</span>
                                        <span className="font-bold">{params.specialParticipationRate}%</span>
                                    </label>
                                    <input type="range" min="0" max="40" value={params.specialParticipationRate} onChange={(e) => handleChange('specialParticipationRate', Number(e.target.value))} className="w-full accent-blue-600" />

                                    <div className="mt-3">
                                        <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Templates de Campo</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['Marlim', 'Jubarte', 'Tupi', 'Roncador'].map(field => (
                                                <button key={field} onClick={() => applyTaxRegimeTemplate(field)} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] hover:bg-slate-100 dark:bg-slate-800">{field}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inputs Exclusivos de Partilha */}
                            {params.taxRegime === 'sharing' && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block flex justify-between">
                                            <span>Custo em Óleo (Limite %)</span>
                                            <span className="font-bold">{params.costOilCap}%</span>
                                        </label>
                                        <input type="range" min="30" max="80" value={params.costOilCap} onChange={(e) => handleChange('costOilCap', Number(e.target.value))} className="w-full accent-emerald-600" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block flex justify-between">
                                            <span>Excedente em Óleo (União %)</span>
                                            <span className="font-bold">{params.profitOilGovShare}%</span>
                                        </label>
                                        <input type="range" min="10" max="90" value={params.profitOilGovShare} onChange={(e) => handleChange('profitOilGovShare', Number(e.target.value))} className="w-full accent-purple-600" />
                                    </div>
                                    <div className="mt-3">
                                        <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Templates de Campo</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['Mero', 'Buzios', 'Sepia', 'Itapu'].map(field => (
                                                <button key={field} onClick={() => applyTaxRegimeTemplate(field)} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] hover:bg-slate-100 dark:bg-slate-800">{field}</button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* P&D */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between mb-2">
                                <span className="flex items-center gap-2"><Activity size={16} className="text-slate-400 dark:text-slate-500" /> Investimento em P&D (% Receita)</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">{params.rdRate}%</span>
                            </label>
                            <input
                                type="range" min="0" max="2" step="0.1"
                                value={params.rdRate}
                                onChange={(e) => handleChange('rdRate', Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Obrigação de 1% da Receita Bruta para campos de grande produção. Dedutível da base do IRPJ/CSLL.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
                {/* --- DEPRECIAÇÃO DETALHADA --- */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" /> Distribuição do CAPEX e Depreciação
                        </h3>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => handleChange('depreciationMode', 'simple')}
                                className={`px-3 py-1 text-xs font-bold rounded ${params.depreciationMode === 'simple' ? 'bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Simples
                            </button>
                            <button
                                onClick={() => handleChange('depreciationMode', 'detailed')}
                                className={`px-3 py-1 text-xs font-bold rounded ${params.depreciationMode === 'detailed' ? 'bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Detalhada
                            </button>
                        </div>
                    </div>

                    {params.depreciationMode === 'simple' ? (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Vida Útil Linear (Anos)</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="5" max="30" value={params.depreciationYears} onChange={(e) => handleChange('depreciationYears', Number(e.target.value))} className="w-full accent-blue-600" />
                                <span className="font-bold text-sm w-8">{params.depreciationYears}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">O valor total do CAPEX será depreciado linearmente por este período.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CAPEX Split - Sliders */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Distribuição do Investimento (%)</h4>

                                {['platform', 'wells', 'subsea'].map(key => {
                                    const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';

                                    return (
                                        <div key={key} className={isDisabled ? 'opacity-50' : ''}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="capitalize">{key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}</span>
                                                <div className="text-right">
                                                    <span className="font-bold mr-2">
                                                        {isDisabled ? '0% (Afretada)' : `${parseFloat(params.capexSplit[key]).toFixed(1)}%`}
                                                    </span>
                                                    {!isDisabled && (
                                                        <span className="text-xs text-slate-700 dark:text-slate-200 font-bold font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                            ${((params.totalCapex * params.capexSplit[key]) / 100 / 1000000000).toFixed(1)}B
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                value={isDisabled ? 0 : params.capexSplit[key]}
                                                disabled={isDisabled}
                                                onChange={(e) => handleChangeCapexSplit(key, Number(e.target.value))}
                                                className={`w-full ${key === 'platform' ? 'accent-blue-600' : key === 'wells' ? 'accent-emerald-600' : 'accent-purple-600'}`}
                                            />
                                        </div>
                                    );
                                })}
                                <div className="text-[10px] text-right text-slate-400 dark:text-slate-500">
                                    Total: {
                                        ((params.platformOwnership === 'chartered' ? 0 : params.capexSplit.platform) +
                                            params.capexSplit.wells +
                                            params.capexSplit.subsea).toFixed(1)
                                    }%
                                </div>
                            </div>

                            {/* Configuração de Método */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">MÉTODO DE DEPRECIAÇÃO POR CATEGORIA</h4>

                                {['platform', 'wells', 'subsea'].map(key => {
                                    const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';
                                    if (isDisabled) return null;

                                    // Solução defensiva para evitar erro se depreciationConfig[key] não estiver definido
                                    if (!params.depreciationConfig || !params.depreciationConfig[key]) return null;

                                    return (
                                        <div key={key} className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold capitalize">{key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}</span>
                                                <select
                                                    value={params.depreciationConfig[key].method}
                                                    onChange={(e) => handleChangeDepreciationConfig(key, 'method', e.target.value)}
                                                    className="text-[10px] p-1 rounded border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-800 dark:text-slate-200"
                                                >
                                                    <option value="linear">Linear</option>
                                                    <option value="accelerated">Acelerada</option>
                                                    <option value="uop">Unidades de Produção (UOP)</option>
                                                </select>
                                            </div>

                                            {params.depreciationConfig[key].method !== 'uop' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 w-16">Anos:</span>
                                                    <input
                                                        type="number" min="1" max="30"
                                                        value={params.depreciationConfig[key].years}
                                                        onChange={(e) => handleChangeDepreciationConfig(key, 'years', Number(e.target.value))}
                                                        className="w-12 p-1 text-[10px] text-right border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxParameters;
