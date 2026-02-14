import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Info } from 'lucide-react';

export default function TechConfigModal({ isOpen, onClose, title, config, defaultConfig, onSave }) {
    // Local state for editing
    const [localConfig, setLocalConfig] = useState(config);
    const [activeTab, setActiveTab] = useState('params'); // 'params' or 'info'

    // Reset local state when config prop changes or modal opens
    useEffect(() => {
        if (isOpen && config) {
            setLocalConfig(JSON.parse(JSON.stringify(config)));
        }
    }, [isOpen, config]);

    if (!isOpen || !localConfig) return null;

    const handleChange = (key, field, value) => {
        setLocalConfig(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleReset = () => {
        if (defaultConfig) {
            setLocalConfig(JSON.parse(JSON.stringify(defaultConfig)));
        }
    };

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    const paramLabels = {
        capexMult: 'Multiplicador de Capex (Materiais)',
        workoverLambda: 'Taxa de Falha (Lambda)',
        rigMult: 'Multiplicador de Taxa de Sonda',
        waitDays: 'Tempo Espera (d)',
        declineRate: 'Declínio Global (%)',
        hyperbolicFactor: 'Fator Hiperbólico (b)',
        breakthroughYears: 'Breakthrough (anos)',
        waterGrowthK: 'Crescimento de Água (k)'
    };

    const paramSteps = {
        capexMult: 0.1,
        rigMult: 0.1,
        hyperbolicFactor: 0.1,
        waterGrowthK: 0.1,
        declineRate: 0.1,
        breakthroughYears: 0.1
    };

    const renderParamInput = (key, param) => {
        const step = paramSteps[key] || "any";

        return (
            <div key={key} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{paramLabels[key] || key}</label>
                    <select
                        value={param.type}
                        onChange={(e) => handleChange(key, 'type', e.target.value)}
                        className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                    >
                        <option value="constant">Constante</option>
                        <option value="triangular">Triangular</option>
                        <option value="normal">Normal</option>
                    </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {param.type === 'constant' && (
                        <div>
                            <label className="text-[9px] text-slate-500 block">Valor</label>
                            <input
                                type="number"
                                step={step}
                                value={param.value}
                                onChange={(e) => handleChange(key, 'value', Number(e.target.value))}
                                className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                    )}
                    {param.type === 'triangular' && (
                        <>
                            <div>
                                <label className="text-[9px] text-slate-500 block">Min</label>
                                <input
                                    type="number"
                                    step={step}
                                    value={param.min}
                                    onChange={(e) => handleChange(key, 'min', Number(e.target.value))}
                                    className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 block">Moda</label>
                                <input
                                    type="number"
                                    step={step}
                                    value={param.mode}
                                    onChange={(e) => handleChange(key, 'mode', Number(e.target.value))}
                                    className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 block">Max</label>
                                <input
                                    type="number"
                                    step={step}
                                    value={param.max}
                                    onChange={(e) => handleChange(key, 'max', Number(e.target.value))}
                                    className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                        </>
                    )}
                    {param.type === 'normal' && (
                        <>
                            <div>
                                <label className="text-[9px] text-slate-500 block">Média</label>
                                <input
                                    type="number"
                                    step={step}
                                    value={param.mean}
                                    onChange={(e) => handleChange(key, 'mean', Number(e.target.value))}
                                    className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 block">DesvPad</label>
                                <input
                                    type="number"
                                    step={step}
                                    value={param.stdDev}
                                    onChange={(e) => handleChange(key, 'stdDev', Number(e.target.value))}
                                    className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-blue-500" />
                            Configurar: {title}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ajuste as distribuições probabilísticas para a simulação</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderParamInput('capexMult', localConfig.capexMult)}
                        {renderParamInput('workoverLambda', localConfig.workoverLambda)}
                        {renderParamInput('rigMult', localConfig.rigMult)}
                        {renderParamInput('waitDays', localConfig.waitDays)}

                        <div className="col-span-1 md:col-span-2 my-2 border-t border-slate-100 dark:border-slate-800"></div>
                        <h4 className="col-span-1 md:col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Engenharia de Reservatório (Curvas de Produção)</h4>

                        {renderParamInput('declineRate', localConfig.declineRate)}
                        {renderParamInput('hyperbolicFactor', localConfig.hyperbolicFactor)}
                        {renderParamInput('breakthroughYears', localConfig.breakthroughYears)}
                        {renderParamInput('waterGrowthK', localConfig.waterGrowthK)}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-3">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                        title="Restaurar valores originais"
                    >
                        <RotateCcw size={16} /> Restaurar Padrões
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Save size={16} /> Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
