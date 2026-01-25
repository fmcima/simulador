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
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Ship className="w-5 h-5 text-blue-600" /> Contratação & Incentivos
                    </h2>

                    <div className="space-y-6">
                        {/* Platform Ownership */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Modelo de Contratação (Plataforma)</label>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => handleChange('platformOwnership', 'owned')}
                                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all ${params.platformOwnership === 'owned' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Própria (CAPEX)
                                </button>
                                <button
                                    onClick={() => handleChange('platformOwnership', 'chartered')}
                                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all ${params.platformOwnership === 'chartered' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Afretada (OPEX)
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                {params.platformOwnership === 'owned'
                                    ? 'Investimento inicial (CAPEX) com depreciação e benefício fiscal.'
                                    : 'Sem investimento inicial. Custo diluído como taxa diária (OPEX).'}
                            </p>
                        </div>

                        {/* Inputs Afretamento */}
                        {params.platformOwnership === 'chartered' && (
                            <div className="p-3 bg-orange-50 rounded border border-orange-100 animate-in fade-in slide-in-from-top-1">
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-orange-800 block mb-1">Valor Presente do Afretamento</label>
                                    <div className="flex items-center gap-2 bg-white rounded border border-orange-200 p-1">
                                        <span className="text-xs font-bold text-orange-600 pl-1">$</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={params.charterPV / 1000000000}
                                            onChange={(e) => handleChange('charterPV', Number(e.target.value) * 1000000000)}
                                            className="w-full text-sm p-1 outline-none text-orange-800 font-bold"
                                        />
                                        <span className="text-xs font-medium text-orange-500 pr-2">Bi</span>
                                    </div>
                                    <div className="text-[10px] text-orange-500 mt-1 text-right">
                                        Valor Total: {formatCurrency(params.charterPV)}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-orange-800 block mb-1 flex justify-between">
                                        <span>Split Contratual (Charter vs Service)</span>
                                        <span>{params.charterSplitPercent}% / {100 - params.charterSplitPercent}%</span>
                                    </label>
                                    <input
                                        type="range" min="0" max="100" step="5"
                                        value={params.charterSplitPercent}
                                        onChange={(e) => handleChange('charterSplitPercent', Number(e.target.value))}
                                        className="w-full accent-orange-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Repetro Slider - DETALHADO */}
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400">Repetro-Sped (% de Benefício)</h4>

                            {['platform', 'wells', 'subsea'].map(key => {
                                const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';
                                const currentVal = typeof params.repetroRatio === 'object' ? params.repetroRatio[key] : params.repetroRatio;

                                return (
                                    <div key={key} className={isDisabled ? 'opacity-50' : ''}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="capitalize">{key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}</span>
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
                        <div className="animate-in fade-in slide-in-from-top-2 mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                            <div className="text-[10px] text-slate-500 text-center">
                                Considerando alíquota base padrão de <strong>{params.capexTaxRate}%</strong> sobre a parcela sem benefício.
                                <div className="mt-1 font-mono text-slate-700 bg-white p-1 rounded border border-slate-100">
                                    Taxa Efetiva Ponderada: <strong>{calculateEffectiveRate()}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-blue-600" /> Configuração do Regime
                    </h2>

                    <div className="space-y-6">
                        {/* Seleção de Regime */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Regime Tributário</label>
                            <div className="flex flex-col gap-2">
                                {['concession', 'sharing', 'transfer_rights'].map(regime => (
                                    <button
                                        key={regime}
                                        onClick={() => handleChange('taxRegime', regime)}
                                        className={`p-3 text-left rounded-lg border transition-all ${params.taxRegime === regime ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className="font-bold text-sm text-slate-800">
                                            {regime === 'concession' ? 'Regime de Concessão' : regime === 'sharing' ? 'Regime de Partilha' : 'Cessão Onerosa'}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {regime === 'concession' ? 'Royalties + Part. Especial + IR/CSLL' :
                                                regime === 'sharing' ? 'Royalties + Custo em Óleo + Excedente União' :
                                                    'Royalties + IR/CSLL (Simples)'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inputs Específicos do Regime */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4 animate-in fade-in">
                            <h4 className="text-xs font-bold uppercase text-slate-500 border-b border-slate-200 pb-1 mb-2">Parâmetros do Regime</h4>

                            {/* Royalties - Comum a todos */}
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Alíquota de Royalties (%)</label>
                                <div className="flex gap-2">
                                    {[5, 10, 15].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => handleChange('royaltiesRate', rate)}
                                            className={`flex-1 py-1 text-xs font-bold rounded border ${params.royaltiesRate === rate ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                                        >
                                            {rate}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs Exclusivos de Concessão */}
                            {params.taxRegime === 'concession' && (
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block flex justify-between">
                                        <span>Participação Especial (Média Efetiva)</span>
                                        <span className="font-bold">{params.specialParticipationRate}%</span>
                                    </label>
                                    <input type="range" min="0" max="40" value={params.specialParticipationRate} onChange={(e) => handleChange('specialParticipationRate', Number(e.target.value))} className="w-full accent-blue-600" />

                                    <div className="mt-3">
                                        <label className="text-[10px] text-slate-400 block mb-1">Templates de Campo</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['Marlim', 'Jubarte', 'Tupi', 'Roncador'].map(field => (
                                                <button key={field} onClick={() => applyTaxRegimeTemplate(field)} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] hover:bg-slate-100">{field}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inputs Exclusivos de Partilha */}
                            {params.taxRegime === 'sharing' && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block flex justify-between">
                                            <span>Custo em Óleo (Limite %)</span>
                                            <span className="font-bold">{params.costOilCap}%</span>
                                        </label>
                                        <input type="range" min="30" max="80" value={params.costOilCap} onChange={(e) => handleChange('costOilCap', Number(e.target.value))} className="w-full accent-emerald-600" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block flex justify-between">
                                            <span>Excedente em Óleo (União %)</span>
                                            <span className="font-bold">{params.profitOilGovShare}%</span>
                                        </label>
                                        <input type="range" min="10" max="90" value={params.profitOilGovShare} onChange={(e) => handleChange('profitOilGovShare', Number(e.target.value))} className="w-full accent-purple-600" />
                                    </div>
                                    <div className="mt-3">
                                        <label className="text-[10px] text-slate-400 block mb-1">Templates de Campo</label>
                                        <div className="flex flex-wrap gap-1">
                                            {['Mero', 'Buzios', 'Sepia', 'Itapu'].map(field => (
                                                <button key={field} onClick={() => applyTaxRegimeTemplate(field)} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] hover:bg-slate-100">{field}</button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
                {/* --- DEPRECIAÇÃO DETALHADA --- */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-600" /> Distribuição do CAPEX e Depreciação
                        </h3>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => handleChange('depreciationMode', 'simple')}
                                className={`px-3 py-1 text-xs font-bold rounded ${params.depreciationMode === 'simple' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Simples
                            </button>
                            <button
                                onClick={() => handleChange('depreciationMode', 'detailed')}
                                className={`px-3 py-1 text-xs font-bold rounded ${params.depreciationMode === 'detailed' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Detalhada
                            </button>
                        </div>
                    </div>

                    {params.depreciationMode === 'simple' ? (
                        <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <label className="text-xs font-medium text-slate-600 block mb-1">Vida Útil Linear (Anos)</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="5" max="30" value={params.depreciationYears} onChange={(e) => handleChange('depreciationYears', Number(e.target.value))} className="w-full accent-blue-600" />
                                <span className="font-bold text-sm w-8">{params.depreciationYears}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">O valor total do CAPEX será depreciado linearmente por este período.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CAPEX Split - Sliders */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Distribuição do Investimento (%)</h4>

                                {['platform', 'wells', 'subsea'].map(key => {
                                    const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';

                                    return (
                                        <div key={key} className={isDisabled ? 'opacity-50' : ''}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="capitalize">{key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}</span>
                                                <div className="text-right">
                                                    <span className="font-bold mr-2">
                                                        {isDisabled ? '0% (Afretada)' : `${params.capexSplit[key]}%`}
                                                    </span>
                                                    {!isDisabled && (
                                                        <span className="text-xs text-slate-700 font-bold font-mono bg-slate-100 px-1 rounded">
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
                                <div className="text-[10px] text-right text-slate-400">
                                    Total: {
                                        (params.platformOwnership === 'chartered' ? 0 : params.capexSplit.platform) +
                                        params.capexSplit.wells +
                                        params.capexSplit.subsea
                                    }%
                                </div>
                            </div>

                            {/* Configuração de Método */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">MÉTODO DE DEPRECIAÇÃO POR CATEGORIA</h4>

                                {['platform', 'wells', 'subsea'].map(key => {
                                    const isDisabled = key === 'platform' && params.platformOwnership === 'chartered';
                                    if (isDisabled) return null;

                                    // Solução defensiva para evitar erro se depreciationConfig[key] não estiver definido
                                    if (!params.depreciationConfig || !params.depreciationConfig[key]) return null;

                                    return (
                                        <div key={key} className="p-3 bg-slate-50 rounded border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold capitalize">{key === 'wells' ? 'Poços' : key === 'platform' ? 'Plataforma' : 'Subsea'}</span>
                                                <select
                                                    value={params.depreciationConfig[key].method}
                                                    onChange={(e) => handleChangeDepreciationConfig(key, 'method', e.target.value)}
                                                    className="text-[10px] p-1 rounded border border-slate-300 outline-none"
                                                >
                                                    <option value="linear">Linear</option>
                                                    <option value="accelerated">Acelerada</option>
                                                    <option value="uop">Unidades de Produção (UOP)</option>
                                                </select>
                                            </div>

                                            {params.depreciationConfig[key].method !== 'uop' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 w-16">Anos:</span>
                                                    <input
                                                        type="number" min="1" max="30"
                                                        value={params.depreciationConfig[key].years}
                                                        onChange={(e) => handleChangeDepreciationConfig(key, 'years', Number(e.target.value))}
                                                        className="w-12 p-1 text-[10px] text-right border border-slate-300 rounded"
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
