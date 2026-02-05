import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Anchor, DollarSign, Box, Info, GitMerge, Activity, Cable, Grip, Settings } from 'lucide-react';

export default function SubseaCapex({ initialParams, onUpdate, wellsParams }) {
    // --- 1. State Definitions ---
    const [mode, setMode] = useState(initialParams?.mode || 'simple'); // 'simple' | 'detailed'
    const [simpleTotal, setSimpleTotal] = useState(initialParams?.simpleTotal || 1200); // $ MM

    // Detailed Params
    const [topology, setTopology] = useState(initialParams?.topology || 'satellite'); // 'satellite' | 'cluster'
    const [avgDistance, setAvgDistance] = useState(initialParams?.avgDistance || 6); // km (FPSO radius)
    const [waterDepth, setWaterDepth] = useState(initialParams?.waterDepth || 2200); // meters

    // Cost Drivers (Industry Averages)
    const [lineCostPerKm, setLineCostPerKm] = useState(initialParams?.lineCostPerKm || 3.5); // $ MM/km (Flowline + Umbilical avg for Flexible/Sweet)
    const [riserCostPerKm, setRiserCostPerKm] = useState(initialParams?.riserCostPerKm || 6.0); // $ MM/km
    const [manifoldCost, setManifoldCost] = useState(initialParams?.manifoldCost || 20); // $ MM per Manifold
    const [plsvRate, setPlsvRate] = useState(initialParams?.plsvRate || 400); // $k/day
    const [pipelayRate, setPipelayRate] = useState(initialParams?.pipelayRate || 650); // $k/day (For Rigid J-Lay/Reel-Lay)
    const [trackRecord, setTrackRecord] = useState(initialParams?.trackRecord || 0.8); // km/day (Lay rate efficiency)
    const [anmCost, setAnmCost] = useState(initialParams?.anmCost || 8.0); // $ MM (Wet Xmas Tree)

    // New Detailed Tech Params
    const [riserTech, setRiserTech] = useState(initialParams?.riserTech || 'flexible'); // 'flexible', 'rigid_scr', 'rigid_lazy_wave'
    const [fluidCorrosivity, setFluidCorrosivity] = useState(initialParams?.fluidCorrosivity || 'sweet'); // 'sweet', 'sour'
    const [insulation, setInsulation] = useState(initialParams?.insulation || 'wet'); // 'wet', 'pip'
    const [hasPiggingLoop, setHasPiggingLoop] = useState(initialParams?.hasPiggingLoop || false);

    // Auto-Set Defaults based on Project Type (Pre-salt vs Post-salt)
    // Run only once on mount if no initialParams provided (or simple Check)
    useEffect(() => {
        if (!initialParams?.riserTech && wellsParams?.wellType === 'pre' && mode === 'detailed') {
            setRiserTech('rigid_lazy_wave');
            setFluidCorrosivity('sour');
            setHasPiggingLoop(true);
            setLineCostPerKm(2.0); // Cheaper material base, but multiplier will hit high
        }
    }, [wellsParams?.wellType, initialParams, mode]);

    // Derived from Wells
    const numWells = useMemo(() => {
        // Safe access to wellsParams
        const prod = wellsParams?.numProducers || 8;
        const inj = wellsParams?.numInjectors || 8;
        return prod + inj;
    }, [wellsParams]);

    // --- 2. Calculations ---
    const costs = useMemo(() => {
        if (mode === 'simple') {
            // Benchmark breakdown for Subsea
            // SURF (Lines): 55%
            // Equipment (Trees/Manifolds - Trees are in Wells, so Manifolds/PLETs): 15%
            // Installation (PLSV): 30%
            return {
                surf: simpleTotal * 0.55,
                equipment: simpleTotal * 0.15,
                installation: simpleTotal * 0.30,
                total: simpleTotal
            };
        }

        // --- Detailed Logic ---

        // --- Detailed Logic ---

        // 1. Tech Multipliers
        const isRigid = riserTech.includes('rigid');
        const isLazyWave = riserTech.includes('lazy_wave');
        const isSour = fluidCorrosivity === 'sour';
        const isPiP = insulation === 'pip';

        const metallurgyMult = isSour ? 2.8 : 1.0; // CRA effect
        const insulationMult = isPiP ? 1.6 : 1.0; // Pipe-in-Pipe effect

        const adjustedLineCost = lineCostPerKm * metallurgyMult * insulationMult;
        // Note: lineCostPerKm input should be "Base Carbon Steel" if using multipliers, 
        // OR "Base Flexible" if flexible. For simplicity, we assume the input is the BASE for the selected tech class.

        // 2. Quantities
        const numRisers = numWells;
        // Riser Length: Water Depth + Catenary factor + Tower/Wave height
        const catenaryFactor = isLazyWave ? 1.8 : 1.5;
        const riserLength = (waterDepth * catenaryFactor) / 1000;
        const totalRiserLength = numRisers * riserLength;

        // Flowlines & Umbilicals
        let totalFlowlineLength = numWells * avgDistance;
        let numManifolds = 0;

        if (topology === 'cluster') {
            // Cluster Logic:
            // Wells -> Manifold (Short jumpers/flowlines): 1km per well avg
            // Manifold -> FPSO (Long flowlines): AvgDistance

            const distWellManifold = 1.0;
            numManifolds = Math.ceil(numWells / 4);

            const wellLines = numWells * distWellManifold;
            let exportLines = numManifolds * avgDistance;

            // Pigging Loop Logic: Needs return line or dual line
            if (hasPiggingLoop) {
                exportLines = exportLines * 2.0;
            }

            totalFlowlineLength = wellLines + exportLines;
        }

        // 3. Hardware Costs
        const costFlowlines = totalFlowlineLength * adjustedLineCost;

        let costRisers = totalRiserLength * riserCostPerKm;
        if (isLazyWave) {
            // Add Buoyancy Modules Cost: ~$1.5 MM per riser set
            costRisers += (numRisers * 1.5);
        }

        const costManifolds = numManifolds * manifoldCost;

        // PLETs / PLEMs Logic
        // Flexible usually needs connection hardware too, but Rigid needs heavy PLETs
        // Rule: 2 PLETs per rigid flowline segment.
        // Segments: Cluster = (Wells + Manifolds), Satellite = (Wells)
        const numSegments = topology === 'cluster' ? (numWells + numManifolds) : numWells;
        const pletUnitCost = isRigid ? 2.5 : 0.5; // Rigid PLET is massive structure
        const costPLETs = numSegments * 2 * pletUnitCost;

        // ANM Cost Calculation
        const costANMs = numWells * anmCost;

        const totalHardware = costFlowlines + costRisers + costManifolds + costPLETs + costANMs;

        // 4. Installation Costs
        const vesselRate = isRigid ? pipelayRate : plsvRate; // Rigid needs J-Lay/Reel-Lay ($$$)
        const laySpeed = isRigid ? (trackRecord * 0.7) : trackRecord; // Rigid is slower (welding)

        const totalLayLength = totalFlowlineLength + totalRiserLength;
        const daysLay = totalLayLength / laySpeed;
        const daysHookup = numWells * (isRigid ? 5 : 3); // Rigid hookup hard
        const totalCampaignDays = daysLay + daysHookup + 21; // +21 days mob/demob

        const costInstallation = (totalCampaignDays * vesselRate) / 1000; // $ MM

        return {
            surf: costFlowlines + costRisers,
            equipment: costManifolds + costPLETs,
            anm: costANMs,
            installation: costInstallation,
            total: totalHardware + costInstallation
        };

    }, [mode, simpleTotal, topology, avgDistance, waterDepth, lineCostPerKm, riserCostPerKm, manifoldCost, plsvRate, pipelayRate, trackRecord, numWells, riserTech, fluidCorrosivity, insulation, hasPiggingLoop, anmCost]);

    // --- 3. Chart Data ---
    const chartData = useMemo(() => {
        if (mode === 'simple') {
            return [
                { name: 'SURF (Linhas)', value: costs.surf, color: '#0ea5e9' },
                { name: 'Equipamentos', value: costs.equipment, color: '#fbbf24' },
                { name: 'Instalação', value: costs.installation, color: '#6366f1' }
            ];
        }
        return [
            { name: 'SURF & Risers', value: costs.surf, color: '#0ea5e9' },
            { name: 'ANM (Árvores)', value: costs.anm, color: '#10b981' }, // Emerald
            { name: 'Equipamentos', value: costs.equipment, color: '#fbbf24' },
            { name: 'Instalação', value: costs.installation, color: '#6366f1' }
        ];
    }, [costs, mode]);

    // --- 4. Auto-Update Parent ---
    const lastNotifiedTotal = useRef(0);
    const lastNotifiedConfig = useRef(null);

    useEffect(() => {
        const currentConfig = {
            mode,
            simpleTotal,
            topology,
            avgDistance,
            waterDepth,
            lineCostPerKm,
            riserCostPerKm,
            manifoldCost,
            plsvRate,
            manifoldCost,
            plsvRate,
            pipelayRate,
            trackRecord,
            riserTech,
            fluidCorrosivity,
            insulation,
            hasPiggingLoop,
            anmCost
        };

        const timeoutId = setTimeout(() => {
            const hasTotalChanged = Math.abs(costs.total - lastNotifiedTotal.current) > 1;
            const hasConfigChanged = JSON.stringify(currentConfig) !== lastNotifiedConfig.current;

            if ((hasTotalChanged || hasConfigChanged) && onUpdate) {
                onUpdate(costs.total, currentConfig);
                lastNotifiedTotal.current = costs.total;
                lastNotifiedConfig.current = JSON.stringify(currentConfig);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [costs.total, mode, simpleTotal, topology, avgDistance, waterDepth, lineCostPerKm, riserCostPerKm, manifoldCost, plsvRate, pipelayRate, trackRecord, riserTech, fluidCorrosivity, insulation, hasPiggingLoop, onUpdate]);


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Mode Selection Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${mode === 'simple' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'} transition-colors`}>
                        <Box size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Modo de Estimativa</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o nível de detalhe do projeto</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('simple')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'simple'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Simples
                    </button>
                    <button
                        onClick={() => setMode('detailed')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'detailed'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Detalhado
                    </button>
                </div>
            </div>
            {/* ... */}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: INPUTS */}
                <div className="lg:col-span-6 space-y-6">
                    {mode === 'simple' ? (
                        /* SIMPLE MODE CARD */
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <DollarSign className="text-blue-500 w-5 h-5" /> Investimento Total (Estimativa)
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Valor Estimado ($ MM)</label>
                                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                            $ {simpleTotal.toLocaleString('pt-BR')} MM
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="200"
                                        max="3000"
                                        step="50"
                                        value={simpleTotal}
                                        onChange={(e) => setSimpleTotal(Number(e.target.value))}
                                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-slate-700"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                        <span>$ 200 MM</span>
                                        <span>$ 3.0 Bi</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                    <p><strong>Nota:</strong> No modo simples, o breakdown de custos (SURF, Hardware e Instalação) é estimado proporcionalmente (55/15/30) para facilitar a visualização.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* DETAILED MODE CONTENT */
                        <div className="space-y-6">

                            {/* Card 1: Scenario & Topology */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <GitMerge className="text-sky-500 w-5 h-5" /> Cenário & Topologia
                                </h3>
                                <div className="space-y-5">
                                    {/* ... Inputs ... */}
                                    {/* Only replacing logic and chart data block, but since replace_file_content needs contiguous, I'm replacing a huge block. */}
                                    {/* Wait, I can just replace the return of calls and chartData def. */}
                                    <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Input de Poços</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{numWells} Poços</span>
                                            <span className="text-xs text-slate-400">({wellsParams?.numProducers || 0} Prod + {wellsParams?.numInjectors || 0} Inj)</span>
                                        </div>
                                    </div>

                                    {/* Topology Toggle */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Arranjo Submarino</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setTopology('satellite')}
                                                className={`p-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${topology === 'satellite'
                                                    ? 'bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <span>Satélite</span>
                                                <span className="text-[10px] font-normal opacity-75">Tie-back direto</span>
                                            </button>
                                            <button
                                                onClick={() => setTopology('cluster')}
                                                className={`p-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${topology === 'cluster'
                                                    ? 'bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <span>Cluster</span>
                                                <span className="text-[10px] font-normal opacity-75">Via Manifold</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Distance & Depth Sliders */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Distância Média FPSO</label>
                                            <div className="flex items-end gap-2">
                                                <input
                                                    type="number"
                                                    value={avgDistance}
                                                    onChange={e => setAvgDistance(Math.max(1, Number(e.target.value)))}
                                                    className="w-16 p-1 text-sm font-bold border rounded bg-transparent dark:text-white dark:border-slate-700"
                                                />
                                                <span className="text-xs text-slate-500 mb-1.5">km</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Lâmina D'água</label>
                                            <div className="flex items-end gap-2">
                                                <input
                                                    type="number"
                                                    value={waterDepth}
                                                    min="100" max="3000" step="100"
                                                    onChange={e => setWaterDepth(Math.max(100, Number(e.target.value)))}
                                                    className="w-16 p-1 text-sm font-bold border rounded bg-transparent dark:text-white dark:border-slate-700"
                                                />
                                                <span className="text-xs text-slate-500 mb-1.5">m</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tech & Metallurgy Selectors */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tecnologia Risers</label>
                                            <select
                                                value={riserTech}
                                                onChange={e => setRiserTech(e.target.value)}
                                                className="w-full text-xs font-bold border rounded p-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            >
                                                <option value="flexible">Flexível (Flexible)</option>
                                                <option value="rigid_scr">Rígido (SCR)</option>
                                                <option value="rigid_lazy_wave">Rígido Lazy Wave</option>
                                                <option value="hybrid_tower">Hybrid Tower</option>
                                            </select>

                                            {/* Didactic Note: Riser */}
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-[10px] leading-snug text-slate-600 dark:text-slate-300">
                                                {riserTech === 'flexible' && (
                                                    <><strong className="text-blue-700 dark:text-blue-400">Flexível:</strong> Padrão histórico (Campos maduros). Mais caro o material, mas instalação rápida com PLSV. Sofre com corrosão (SCC-CO2) no Pré-Sal.</>
                                                )}
                                                {riserTech === 'rigid_scr' && (
                                                    <><strong className="text-blue-700 dark:text-blue-400">Rígido (SCR):</strong> Tubo de aço. Material barato, mas exige navio de lançamento complexo (J-Lay). Limitado por fadiga em grandes lâminas d'água.</>
                                                )}
                                                {riserTech === 'rigid_lazy_wave' && (
                                                    <><strong className="text-blue-700 dark:text-blue-400">Rígido Lazy Wave:</strong> Padrão Pré-Sal (Ex: Mero). Adiciona flutuadores para desacoplar movimentos do FPSO. Custo extra de Hardware (Buoyancy) para viabilizar SCR.</>
                                                )}
                                                {riserTech === 'hybrid_tower' && (
                                                    <><strong className="text-blue-700 dark:text-blue-400">Hybrid Riser Tower:</strong> Torre vertical ancorada. Excelente para águas ultra-profundas e descongestionamento do FPSO. Capex inicial altíssimo (Hardware complexo).</>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Metalurgia (Fluido)</label>
                                            <select
                                                value={fluidCorrosivity}
                                                onChange={e => setFluidCorrosivity(e.target.value)}
                                                className="w-full text-xs font-bold border rounded p-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            >
                                                <option value="sweet">Sweet (CS)</option>
                                                <option value="sour">Sour / High CO2 (CRA)</option>
                                            </select>

                                            {/* Didactic Note: Metallurgy */}
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded text-[10px] leading-snug text-slate-600 dark:text-slate-300">
                                                {fluidCorrosivity === 'sweet' && (
                                                    <><strong className="text-amber-700 dark:text-amber-500">Sweet (Carbon Steel):</strong> Aço Carbono convencional. Usado quando há baixo CO2/H2S. Custo base.</>
                                                )}
                                                {fluidCorrosivity === 'sour' && (
                                                    <><strong className="text-amber-700 dark:text-amber-500">Sour (CRA):</strong> Liga Resistente à Corrosão (Clad/Lined). Obrigatório no Pré-Sal (alto CO2). <span className="font-bold">Impacto: ~2.8x custo de linha.</span></>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Garantia de Escoamento</label>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${insulation === 'pip' ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                                                    {insulation === 'pip' && <Settings size={10} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={insulation === 'pip'}
                                                    onChange={e => setInsulation(e.target.checked ? 'pip' : 'wet')}
                                                    className="hidden"
                                                />
                                                Pipe-in-Pipe (PiP)
                                            </label>

                                            {topology === 'cluster' && (
                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${hasPiggingLoop ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                                                        {hasPiggingLoop && <Settings size={10} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={hasPiggingLoop}
                                                        onChange={e => setHasPiggingLoop(e.target.checked)}
                                                        className="hidden"
                                                    />
                                                    Loop de Pigging
                                                </label>
                                            )}
                                        </div>

                                        {/* Didactic Note: Flow Assurance */}
                                        {(insulation === 'pip' || hasPiggingLoop) && (
                                            <div className="mt-1 p-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded text-[10px] leading-snug text-slate-600 dark:text-slate-300 space-y-1">
                                                {insulation === 'pip' && (
                                                    <div><strong className="text-emerald-700 dark:text-emerald-500">Pipe-in-Pipe:</strong> Tubo duplo para isolamento térmico extremo. Evita parafinas/hidratos em longas distâncias. <span className="font-bold">Impacto: +60% custo de material.</span></div>
                                                )}
                                                {hasPiggingLoop && (
                                                    <div><strong className="text-emerald-700 dark:text-emerald-500">Pigging Loop:</strong> Retorno necessário para passar PIG em arranjos submarinos complexos. <span className="font-bold">Impacto: Dobra a extensão do flowline de exportação.</span></div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional Hardware Costs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block truncate" title="Custo Unitário ANM">ANM Unitário ($ MM)</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-xs font-bold text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="1"
                                                    value={anmCost}
                                                    onChange={e => setAnmCost(Number(e.target.value))}
                                                    className="w-full pl-5 p-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Costs & Installation */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <Settings className="text-amber-500 w-5 h-5" /> Premissas de Custo
                                </h3>

                                <div className="space-y-4">
                                    {/* Cost Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block truncate" title="Custo Médio de Linhas (Flow + Umb)">Linhas (SURF) ($ MM/km)</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-xs font-bold text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={lineCostPerKm}
                                                    onChange={e => setLineCostPerKm(Number(e.target.value))}
                                                    className="w-full pl-5 p-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block truncate" title="Diária de PLSV">Diária PLSV ($ k/dia)</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-xs font-bold text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    step="10"
                                                    value={plsvRate}
                                                    onChange={e => setPlsvRate(Number(e.target.value))}
                                                    className="w-full pl-5 p-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Efficiency */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase">Eficiência de Lançamento (km/dia)</label>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{trackRecord} km/d</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.2" max="2.0" step="0.1"
                                            value={trackRecord}
                                            onChange={e => setTrackRecord(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-slate-700"
                                        />
                                    </div>

                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: RESULTS */}
                <div className="lg:col-span-6 space-y-6">
                    {/* TOTAL CAPEX CARD */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 justify-center md:justify-start">
                                    <Cable size={16} /> CAPEX Submarino
                                </div>
                                <div className="text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                                    $ {Math.round(costs.total).toLocaleString('pt-BR')} MM
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Breakdown Estimado</h4>
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius + 20;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            const textAnchor = x > cx ? 'start' : 'end';

                                            return (
                                                <text x={x} y={y} fill="#64748b" textAnchor={textAnchor} dominantBaseline="central" fontSize={11} className="dark:fill-slate-400">
                                                    {name}
                                                    <tspan x={x} dy="14" fontSize={10} fontWeight="bold">
                                                        $ {Math.round(value).toLocaleString('pt-BR')} MM ({(percent * 100).toFixed(0)}%)
                                                    </tspan>
                                                </text>
                                            );
                                        }}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => `$${val.toFixed(0)}M`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Details Table */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 overflow-auto">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Detalhamento (USD Milhões)</h4>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {chartData.map((item, idx) => {
                                        const percent = (item.value / costs.total) * 100;
                                        return (
                                            <tr key={idx} className="group">
                                                <td className="py-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                        {item.name}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                    $ {Math.round(item.value).toLocaleString('pt-BR')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                        <td className="py-3 font-bold text-slate-900 dark:text-white">TOTAL</td>
                                        <td className="py-3 text-right font-bold text-sky-600 dark:text-sky-400">$ {Math.round(costs.total).toLocaleString('pt-BR')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
