export const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        notation: value > 1000000 ? 'compact' : 'standard'
    }).format(value);
};

export const formatBillions = (value) => {
    const inBillions = value / 1000000000;
    return `$${inBillions.toFixed(2)}B`;
};

export const formatMillionsNoDecimals = (value) => {
    const inMillions = value / 1000000;
    return `$${inMillions.toFixed(0)}M`;
};

export const safeNumber = (value) => {
    return Number.isFinite(value) ? value : 0;
};

/**
 * Calculate time-dependent failure rate (lambda) that increases with well age
 * while maintaining the average rate equal to the input parameter.
 * 
 * @param {number} lambdaAvg - Average failure rate (e.g., 0.15 = 15% of wells fail per year)
 * @param {number} year - Current year in project timeline (0-indexed)
 * @param {number} projectDuration - Total project duration in years
 * @param {number} growthFactor - How much the rate grows (0 = constant, 1 = moderate growth, 2 = high growth)
 * @returns {number} Time-dependent failure rate for the given year
 * 
 * Uses linear growth model: λ(t) = λ_avg * (1 + k * (t/T - 0.5))
 * This ensures the average over the project lifetime equals λ_avg while modeling aging effects.
 */
export const getTimeDependentLambda = (lambdaAvg, year, projectDuration, growthFactor = 1.5) => {
    if (!lambdaAvg || lambdaAvg === 0) return 0;

    // Normalize year to [0, 1] range
    const normalizedTime = year / Math.max(projectDuration - 1, 1);

    // Linear growth: starts at (1 - k/2) and ends at (1 + k/2)
    // This ensures the average is exactly 1 when integrated over [0, 1]
    const multiplier = 1 + growthFactor * (normalizedTime - 0.5);

    // Ensure non-negative values
    return Math.max(0, lambdaAvg * multiplier);
};

export const calculateNPV = (rate, cashFlows) => {
    const r = (Number(rate) || 0) / 100;
    return cashFlows.reduce((acc, val, t) => acc + val / Math.pow(1 + r, t), 0);
};

// --- Statistical Helper Functions ---

export const triangularRandom = (min, mode, max) => {
    const u = Math.random();
    const fc = (mode - min) / (max - min);
    if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
};

export const normalRandom = (mean, stdDev) => {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
};

export const calculateDiscountedPayback = (rate, cashFlows) => {
    const r = Number(rate);
    if (isNaN(r)) return null;

    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        // Ensure discount factor is correct
        const discountFactor = Math.pow(1 + r / 100, t);
        const discountedVal = cashFlows[t] / discountFactor;

        const previousCum = cumulative;
        cumulative += discountedVal;

        if (cumulative >= 0) {
            if (t === 0) return 0;
            // Interpolation: Time + (Remaining Negative / Inflow during period)
            // Using abs(previousCum) because it's the amount we need to cover
            return t - 1 + Math.abs(previousCum) / discountedVal;
        }
    }
    return null;
};

export const calculateIRR = (cashFlows, guess = 0.1) => {
    const maxIterations = 1000;
    const tolerance = 0.00001;
    let rate = guess;
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            const term = Math.pow(1 + rate, t);
            npv += cashFlows[t] / term;
            if (t > 0) derivative -= (t * cashFlows[t]) / (term * (1 + rate));
        }
        if (Math.abs(npv) < tolerance) return rate * 100;
        const newRate = rate - npv / derivative;
        if (Math.abs(newRate - rate) < tolerance) return newRate * 100;
        if (isNaN(newRate) || !isFinite(newRate)) return null;
        rate = newRate;
    }
    return null;
};

export const getBrentCurve = (params, duration) => {
    const curve = [];
    const { brentStrategy, brentPrice, brentLongTerm, brentPeakValue, brentPeakYear } = params;

    for (let year = 0; year <= duration + 5; year++) {
        let price = brentPrice;

        if (brentStrategy === 'constant') {
            price = brentPrice;
        } else if (brentStrategy === 'market_bull') {
            if (year <= 5) {
                price = brentPrice * (1 + 0.05 * year);
            } else {
                price = brentPrice * 1.25;
            }
        } else if (brentStrategy === 'market_bear') {
            price = Math.max(30, brentPrice * Math.pow(0.97, year));
        } else if (brentStrategy === 'custom') {
            const peakY = Number(brentPeakYear) || 5;
            const peakV = Number(brentPeakValue) || 90;
            const longTerm = Number(brentLongTerm) || 60;

            if (year <= peakY) {
                // Rampa até o pico
                const slope = (peakV - brentPrice) / Math.max(1, peakY);
                price = brentPrice + slope * year;
            } else {
                // Decaimento até longo prazo
                const decayDuration = 5; // Ajustável se necessário
                const stepsAfterPeak = year - peakY;
                if (stepsAfterPeak <= decayDuration) {
                    const slope = (longTerm - peakV) / decayDuration;
                    price = peakV + slope * stepsAfterPeak;
                } else {
                    price = longTerm;
                }
            }
        }
        curve.push(safeNumber(price));
    }
    return curve;
};

export const calculatePeakFromReserves = (totalReservesMMbbl, rampUp, plateau, decline, duration) => {
    let integratedVolume = 0;
    for (let t = 1; t <= duration; t++) {
        let factor = 0;
        if (t <= rampUp) {
            factor = rampUp > 0 ? t / rampUp : 1;
        } else if (t <= rampUp + plateau) {
            factor = 1;
        } else {
            const yearsPostPlateau = t - (rampUp + plateau);
            factor = Math.pow(1 - decline / 100, yearsPostPlateau);
        }
        integratedVolume += factor * 0.365;
    }
    if (integratedVolume === 0) return 0;
    return totalReservesMMbbl / integratedVolume;
};

export const generateProjectData = (params) => {
    const {
        totalCapex,
        capexDuration = 5,
        capexPeakRelative, capexConcentration,
        peakProduction, brentSpread,
        rampUpDuration, plateauDuration, declineRate, hyperbolicFactor = 0.5, opexMargin,

        // OPEX Detalhado
        opexMode = 'simple',
        opexFixed = 100000000,
        opexVariable = 4,
        workoverCost = 10000000,
        costInflation = 2,

        // Produção Detalhada (Reservatório & Fluidos)
        productionMode = 'simple',
        oilAPI = 28,
        gor = 150, // m³/m³
        maxLiquids = 200000, // bpd capacidade de líquidos

        discountRate, projectDuration,

        // Tributário & Depreciação
        taxRegime, royaltiesRate, specialParticipationRate, costOilCap, profitOilGovShare, corporateTaxRate = 34,
        govTake,

        // Depreciação Detalhada
        depreciationMode,
        depreciationYears,
        capexSplit,
        depreciationConfig,
        totalReserves,

        // Novos Parâmetros de Contratação
        platformOwnership, // 'owned' | 'chartered'
        charterPV,
        charterSplit = { charter: 85, service: 15 },
        serviceTaxRate = 14.25,
        repetroRatio = { platform: 100, wells: 100, subsea: 100 },
        capexTaxRate = 40
    } = params;

    // --- DEBUGGING ---
    console.log('--- START generateProjectData ---');
    console.log('Ownership:', platformOwnership);
    console.log('CapexDuration:', capexDuration);
    console.log('ProjectDuration:', projectDuration);
    console.log('DiscountRate:', discountRate);
    console.log('CharterPV:', charterPV);
    console.log('TotalCapex:', totalCapex);
    // ----------------

    const data = [];
    let cashFlowsVector = [];
    let discountedCapexSum = 0;

    const brentCurve = getBrentCurve(params, projectDuration);

    // --- CÁLCULO DO CAPEX EFETIVO E IMPOSTOS (REPETRO) ---
    // --- CÁLCULO DO CAPEX EFETIVO E IMPOSTOS (REPETRO) ---
    // Refatorado para permitir repetro diferenciado por componente

    // Normalização defensiva caso capexSplit não some 100 (embora a UI restrinja)
    const splitTotal = capexSplit.platform + capexSplit.wells + capexSplit.subsea;
    const normPlatform = capexSplit.platform / splitTotal;
    const normWells = capexSplit.wells / splitTotal;
    const normSubsea = capexSplit.subsea / splitTotal;

    // Normalização do repetroRatio (caso venha legado como número ou objeto)
    const repetro = typeof repetroRatio === 'object' ? repetroRatio : { platform: repetroRatio, wells: repetroRatio, subsea: repetroRatio };

    // Cálculo da taxa efetiva ponderada
    // Imposto = %Componente * (1 - %RepetroComp) * TaxRateBase
    const taxSharePlatform = normPlatform * (1 - repetro.platform / 100) * (capexTaxRate / 100);
    const taxShareWells = normWells * (1 - repetro.wells / 100) * (capexTaxRate / 100);
    const taxShareSubsea = normSubsea * (1 - repetro.subsea / 100) * (capexTaxRate / 100);

    const effectiveTaxRate = taxSharePlatform + taxShareWells + taxShareSubsea;

    const capexTaxTotal = totalCapex * effectiveTaxRate;
    const effectiveTotalCapex = totalCapex + capexTaxTotal; // Base para depreciação cresce com impostos capitalizados

    // --- LÓGICA DE AFRETAMENTO vs PRÓPRIA ---
    let capexForConstruction = totalCapex; // Base sem impostos (serão adicionados no fluxo)
    let applicableTaxRate = effectiveTaxRate; // Taxa padrão (pode mudar se o mix de ativos mudar)
    let annualCharterCost = 0;

    let assetBase = {
        platform: 0,
        wells: 0,
        subsea: 0
    };

    if (platformOwnership === 'chartered') {
        const r = (Number(discountRate) || 0) / 100;
        const n = Number(projectDuration) || 30;
        const pv = Number(charterPV) || 0;

        // CORREÇÃO DE MOMENTO DO VPL:
        // O input 'charterPV' é o VPL desejado em T=0.
        // O pagamento começa no primeiro óleo (productionStart), geralmente após capexDuration.
        // Se capexDuration = 3, o primeiro ano de produção é o ano 4.
        const startDelay = Number(capexDuration) || 0;

        // Trazemos o PV de T=0 para o futuro (T=startDelay) para calcular a anuidade a partir dali
        const discountFactor = Math.pow(1 + r, startDelay);
        const pvAtStart = pv * (isFinite(discountFactor) ? discountFactor : 1);

        let baseAnnualCharter = 0;
        if (r > 0 && n > 0) {
            // Anuidade baseada no PV capitalizado
            const denominator = 1 - Math.pow(1 + r, -n);
            if (denominator !== 0 && isFinite(denominator)) {
                baseAnnualCharter = (pvAtStart * r) / denominator;
            } else {
                baseAnnualCharter = pvAtStart / n;
            }
        } else if (n > 0) {
            baseAnnualCharter = pv / n;
        }

        if (!Number.isFinite(baseAnnualCharter)) baseAnnualCharter = 0;

        // Ensure finite result
        if (!Number.isFinite(baseAnnualCharter)) baseAnnualCharter = 0;

        // --- DEBUGGING ---
        console.log('Charter Calc:', { pvAtStart, baseAnnualCharter, r, n, startDelay });
        // ----------------

        // Recuperar parâmetros de impostos

        // Ensure finite result
        if (!Number.isFinite(baseAnnualCharter)) baseAnnualCharter = 0;

        // Recuperar parâmetros de impostos
        const cSplit = Number(charterSplit?.charter);
        const sSplit = Number(charterSplit?.service);
        const sTax = Number(serviceTaxRate);

        // Padrões robustos
        const safeCharterPct = (!isNaN(cSplit) ? cSplit : 85) / 100;
        const safeServicePct = (!isNaN(sSplit) ? sSplit : 15) / 100;
        const safeTaxRate = (!isNaN(sTax) ? sTax : 14.25) / 100;

        // LÓGICA DE TRIBUTAÇÃO DE SERVIÇOS NO NOVO REGIME REPETRO-SPED / LEI 13.586
        // Normalmente, a parcela de serviços é Gross-Up (o valor contratado inclui os impostos).
        // Se a taxa diária total (D) é composta de Charter (C) e Serviço (S), e S sofre impostos (T):
        // D = C + S_net / (1-T) ??? 
        // OU A lógica do "Split Contratual" define como o valor é dividido:
        // Parcela Charter = Isenta. Parcela Serviço = Tributada.
        // A user instruction "Impostos sobre Serviços (PIS/COFINS/ISS) 14.25%" sugere um add-on cost ou inside?
        // Assumindo que o "Valor PV" inserido pelo usuário é o CUSTO TOTAL DE ALUGUEL PURO (sem impostos extras), 
        // ou seja, o valor que vai para o fornecedor. Os impostos são um custo EXTRA para o operador.
        // ENTÃO: Custo Total = (Base * %Charter) + (Base * %Service * (1 + TaxRate))
        // Se o imposto é "por fora" ou cumulativo, a fórmula (1 + rate) é segura.
        // Se fosse "por dentro" (gross-up), seria / (1 - rate).
        // Dado o contexto brasileiro de PIS/COFINS, geralmente é "por dentro", mas para simplificar e garantir
        // que o custo aumente (piorando o VPL do charter como esperado), vamos aplicar como custo adicional.

        // CORREÇÃO FINAL: O split incide sobre o valor base.
        const partCharter = baseAnnualCharter * safeCharterPct;
        const partServiceBase = baseAnnualCharter * safeServicePct;

        // Impostos incidem sobre a base de serviço.
        // Se o imposto é 14.25%, o custo total do serviço é Base + (Base * 14.25%) ?
        // Ou é Base / (1 - 14.25%)? - Vamos usar a lógica de gross-up para ser mais conservador (mais caro).
        const partServiceGross = partServiceBase / (1 - safeTaxRate);

        // annualCharterCost é o desembolso total anual
        annualCharterCost = partCharter + partServiceGross;


        // CORREÇÃO: No modo chartered, o operador NÃO paga o CAPEX da plataforma.
        // O totalCapex contém a plataforma, mas apenas Wells e Subsea são ativos do operador.

        // 1. Calcula a base (Net) de cada componente do operador
        const wellsBase = totalCapex * (capexSplit.wells / 100);
        const subseaBase = totalCapex * (capexSplit.subsea / 100);

        // 2. Calcula o imposto específico desses componentes
        // taxShare = (part % * (1-repes) * rate). Multiplicando por Total, temos o valor absoluto do imposto.
        const wellsTax = totalCapex * taxShareWells;
        const subseaTax = totalCapex * taxShareSubsea;

        // 3. Define a base depreciável (Gross = Net + Tax)
        assetBase.platform = 0;
        assetBase.wells = wellsBase + wellsTax;
        assetBase.subsea = subseaBase + subseaTax;

        // 4. Redefine o CAPEX de Construção (Cash Outflow Base) apenas com a parte do operador
        capexForConstruction = wellsBase + subseaBase;

        // 5. Recalcula a Taxa Efetiva de Imposto para o novo mix (apenas Wells/Subsea)
        // Isso é crucial porque a taxa média original incluía a plataforma (que pode ter rate diferente).
        const operatorBase = wellsBase + subseaBase;
        const operatorTax = wellsTax + subseaTax;

        if (operatorBase > 0) {
            applicableTaxRate = operatorTax / operatorBase;
        } else {
            applicableTaxRate = 0;
        }

    } else {
        assetBase.platform = effectiveTotalCapex * (capexSplit.platform / 100);
        assetBase.wells = effectiveTotalCapex * (capexSplit.wells / 100);
        assetBase.subsea = effectiveTotalCapex * (capexSplit.subsea / 100);
    }

    const constructionCapexTotal = capexForConstruction * 0.85;
    const postOilCapexTotal = capexForConstruction * 0.15;

    let capexWeights = [];
    let weightSum = 0;
    // capexPeakRelative agora é o ano do pico (1 a capexDuration), então convertemos para índice (0-based)
    const peakIndex = Math.max(0, Math.min(capexDuration - 1, (capexPeakRelative || capexDuration) - 1));
    // capexConcentration agora é % (0-100), quanto maior, mais concentrado
    const concentrationFactor = Math.max(1, capexConcentration / 10); // 10% = 1, 100% = 10
    const sigma = Math.max(0.1, (capexDuration) / concentrationFactor);
    for (let i = 0; i < capexDuration; i++) {
        const w = Math.exp(-Math.pow(i - peakIndex, 2) / (2 * sigma * sigma));
        capexWeights.push(w);
        weightSum += w;
    }

    let decommissioningCost = 0;

    if (params.abexMode === 'detailed') {
        // 1. Wells P&A
        const numWells = params.wellsParams?.numWells || 16;
        const abexPerWell = params.abexPerWell || 25000000;
        const wellsAbex = numWells * abexPerWell;

        // 2. Subsea Removal (Based on Subsea CAPEX)
        const subseaCapex = totalCapex * (capexSplit.subsea / 100);
        const subseaAbexPct = params.abexSubseaPct || 25;
        const subseaAbex = subseaCapex * (subseaAbexPct / 100);

        // 3. Platform Decommissioning (Cleaning + Towing)
        const platformAbex = params.abexPlatform || 150000000;

        decommissioningCost = wellsAbex + subseaAbex + platformAbex;
    } else {
        // Default Simple Mode: % of Total CAPEX
        const simpleRate = params.abexSimpleRate || 15;
        decommissioningCost = totalCapex * (simpleRate / 100);
    }

    let accumulatedDepreciation = { platform: 0, wells: 0, subsea: 0, simple: 0 };
    let accumulatedRecoverableCost = 0;
    let accumulatedLoss = 0;

    let accumulatedDiscountedCashFlow = 0;

    for (let year = 0; year <= projectDuration + 1; year++) {
        let capex = 0;
        let revenue = 0;
        let opex = 0;
        let charterCost = 0;
        let taxes = 0;
        let capexTax = 0;
        let depreciation = 0;
        let isDecomYear = (year === projectDuration + 1);
        let productionVolume = 0;
        let productionMMbbl = 0;
        let waterVolume = 0;
        let liquidVolume = 0;
        let currentBSW = 0;

        let royalties = 0;
        let specialParticipation = 0;
        let profitOilGov = 0;
        let corporateTax = 0;

        if (year < capexDuration) {
            const weight = capexWeights[year] / weightSum;
            // Apply Inflation to CAPEX (Nominal Terms)
            // Assuming inputs are in Real Terms (Year 0).
            const capexInflationFactor = Math.pow(1 + costInflation / 100, year);

            const capexBase = (constructionCapexTotal * weight) * capexInflationFactor;
            // Imposto Proporcional ao desembolso
            const taxPart = capexBase * applicableTaxRate;

            capex += capexBase + taxPart;
            capexTax += taxPart;
        }

        const productionYear = year - (capexDuration - 1);
        if (productionYear === 1 || productionYear === 2) {
            // Post-Oil CAPEX also suffers inflation
            const capexInflationFactor = Math.pow(1 + costInflation / 100, year);
            const capexBase = (postOilCapexTotal / 2) * capexInflationFactor;

            const taxPart = capexBase * applicableTaxRate;
            capex += capexBase + taxPart;
            capexTax += taxPart;
        }

        if (isDecomYear) {
            capex += decommissioningCost;
        }

        if (!isDecomYear && capex > 0) {
            discountedCapexSum += capex / Math.pow(1 + discountRate / 100, year);
        }

        const yearlyBrent = brentCurve[year] || brentCurve[brentCurve.length - 1];
        const netOilPrice = yearlyBrent * (1 - brentSpread / 100);

        if (productionYear > 0 && !isDecomYear) {
            // Decline Rate is now pre-adjusted in the project state (via App.jsx) if Smart Well is active.
            // This ensures the sliders and calculation match.
            let effectiveDeclineRate = declineRate;

            if (productionYear <= rampUpDuration) {
                productionVolume = peakProduction * (productionYear / rampUpDuration);
            } else if (productionYear <= rampUpDuration + plateauDuration) {
                productionVolume = peakProduction;
            } else {
                const yearsPostPlateau = productionYear - (rampUpDuration + plateauDuration);
                const Di = effectiveDeclineRate / 100;
                const b = hyperbolicFactor;

                // Arps Hyperbolic Decline Model
                if (b === 0) {
                    // Exponential Decline (Limit when b -> 0)
                    productionVolume = peakProduction * Math.exp(-Di * yearsPostPlateau);
                } else {
                    // Hyperbolic Decline
                    const denominator = Math.pow(1 + b * Di * yearsPostPlateau, 1 / b);
                    productionVolume = peakProduction / denominator;
                }
            }



            // Aplicar restrição de capacidade de líquidos (BSW/Gargalo)
            // Utilizando o Modelo de BSW: Função Logística Generalizada
            if (productionMode === 'detailed') {
                const timeSinceFirstOil = productionYear;
                const minDecline = 5; // Minimum decline to prevent flat forever if curve is weird

                // ... (Existing Arps Logic) ... 
                // Note: The variable 'productionVolume' is calculated above using Arps (lines 310-328)

                // --- NEW: Workover Downtime Efficiency Loss ---
                // If workover parameters exist, calculate downtime loss.
                // Uses time-dependent failure rate that increases with well age
                // Supports both "wearout" and "bathtub" failure profiles
                // Efficiency = 1 - (Lambda(t) * WaitDays / 365)
                // WaitDays is the time production is STOPPED per failure event.
                if (params.workoverLambda !== undefined && params.workoverLambda > 0 &&
                    params.workoverTesp !== undefined && params.workoverTesp > 0) {
                    const lambdaAvg = params.workoverLambda;
                    const waitDays = params.workoverTesp; // "Tempo Espera"
                    const projectDuration = params.projectDuration || 30;
                    const failureProfile = params.workoverFailureProfile || 'wearout';

                    let lambda;

                    if (failureProfile === 'bathtub') {
                        // Bathtub curve: High at start, low in middle, high at end
                        // Uses quadratic function: λ(t) = a*(t/T - 0.5)^2 + b
                        // Where 'a' controls depth and 'b' is the minimum
                        const normalizedTime = year / Math.max(projectDuration - 1, 1);
                        const centered = normalizedTime - 0.5; // Center at 0.5

                        // Set minimum to 50% of average, peaks at 2x average at ends
                        const minLambda = lambdaAvg * 0.5;
                        const maxLambda = lambdaAvg * 2.0;
                        const a = (maxLambda - minLambda) * 4; // Coefficient for quadratic
                        const b = minLambda;

                        lambda = a * centered * centered + b;
                        lambda = Math.max(0, Math.min(maxLambda, lambda));
                    } else {
                        // Wearout (default): Linear growth model
                        // λ(t) = λ_avg * (1 + k * (t/T - 0.5))
                        const growthFactor = 1.5;
                        const normalizedTime = year / Math.max(projectDuration - 1, 1);
                        const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
                        lambda = Math.max(0, lambdaAvg * multiplier);
                    }

                    const downtimeDaysPerYear = lambda * waitDays;
                    const efficiency = Math.max(0, 1 - (downtimeDaysPerYear / 365));

                    productionVolume *= efficiency;
                }

                // t é o tempo desde o primeiro óleo (timeSinceFirstOil)
                const BSW_max = (params.bswMax || 95) / 100;
                const t_bt = params.bswBreakthrough || 5;
                const k = params.bswGrowthRate || 1.2;

                // ... (Rest of BSW Logic) ...

                // Fórmula Logística: BSW(t) = BSW_max / (1 + Math.exp(-k * (t - t_inflection)))
                // Ajuste: O usuário considera "Breakthrough" como o momento em que BSW atinge 2%.
                // Derivação: 0.02 = BSW_max / (1 + exp(-k * (t_bt - t_inflection)))
                // exp(-k * (t_bt - t_inflection)) = (BSW_max / 0.02) - 1
                // -k * (t_bt - t_inflection) = ln((BSW_max / 0.02) - 1)
                // t_inflection = t_bt + ln((BSW_max / 0.02) - 1) / k

                const ratio = (BSW_max / 0.02) - 1;
                const offset = ratio > 0 ? Math.log(ratio) / k : 0;
                const t_inflection = t_bt + offset;

                const waterCut = BSW_max / (1 + Math.exp(-k * (timeSinceFirstOil - t_inflection)));
                currentBSW = isNaN(waterCut) ? 0 : waterCut;

                // Máximo de óleo = capacidade de líquidos * (1 - water cut)
                const capacityLiquidsKbpd = maxLiquids / 1000;
                const maxOilFromLiquids = capacityLiquidsKbpd * (1 - currentBSW);

                // Se o gargalo de líquidos permitir menos óleo que o potencial do reservatório, cortamos a produção
                // Oil = min(Reservoir, Capacity_Oil)
                const potentialOil = productionVolume; // Arps result (already reduced by efficiency)
                productionVolume = Math.min(potentialOil, maxOilFromLiquids);
                if (isNaN(productionVolume)) productionVolume = 0;

                // Back-calculate Liquids
                if (productionVolume >= maxOilFromLiquids) {
                    liquidVolume = capacityLiquidsKbpd;
                } else {
                    liquidVolume = productionVolume / (1 - currentBSW);
                }

                waterVolume = liquidVolume - productionVolume;

                if (isNaN(liquidVolume)) liquidVolume = 0;
                if (isNaN(waterVolume)) waterVolume = 0;
            } else {
                liquidVolume = productionVolume;
                if (isNaN(productionVolume)) productionVolume = 0;
                if (isNaN(liquidVolume)) liquidVolume = 0;
            }

            productionMMbbl = (productionVolume * 1000 * 365) / 1000000;

            // Ajuste de preço pelo Grau API (base: 30º = 0%)
            // ±0.4% por grau acima/abaixo de 30 (máx ±8% para API 10-50)
            const apiPriceAdjustment = productionMode === 'detailed' ? 1 + ((oilAPI - 30) * 0.004) : 1;
            const adjustedOilPrice = netOilPrice * apiPriceAdjustment;
            revenue = productionMMbbl * 1000000 * adjustedOilPrice;

            // Define inflation factor for both OPEX and Charter
            const inflationFactor = Math.pow(1 + costInflation / 100, productionYear - 1);

            // Cálculo de OPEX baseado no modo
            let gasInjectionCost = 0;
            if (productionMode === 'detailed' && gor > 200) {
                // GOR acima de 200 m³/m³: custo de injeção de gás excedente
                // Custo de ~$1.50/bbl para gás excedente reinjetado
                const excessGOR = gor - 200;
                const excessGasVolume = productionMMbbl * excessGOR / 1000; // MM m³
                gasInjectionCost = excessGasVolume * 1500000; // ~$1.5M por MM m³
            }

            if (opexMode === 'detailed') {
                // Detailed Model: Fixed + Variable + Workover Provision + Gas Injection
                const fixedOpex = opexFixed * inflationFactor;
                const variableOpex = productionMMbbl * 1000000 * opexVariable;

                // Recalculate Workover dynamically to support Monte Carlo variations (Lambda)
                // If workoverLambda is provided in params, use it. Otherwise fallback to the static workoverCost.
                // Uses time-dependent failure rate that increases with well age
                let calculatedWorkover = workoverCost;

                if (params.workoverLambda !== undefined && params.workoverLambda > 0) {
                    const numWells = params.wellsParams?.numWells || 16;
                    const lambdaAvg = params.workoverLambda;
                    const mob = params.workoverMobCost || 8;
                    const dur = params.workoverDuration || 20;
                    const rate = params.workoverDailyRate || 800;
                    const projectDuration = params.projectDuration || 30;
                    const failureProfile = params.workoverFailureProfile || 'wearout';

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

                    // Cost = NumWells * Lambda(t) * (Mob + Dur * Rate)
                    const costPerEvent = mob + (dur * rate / 1000); // $ MM
                    calculatedWorkover = (numWells * lambda * costPerEvent * 1000000);
                }

                const workover = calculatedWorkover * inflationFactor;
                opex = fixedOpex + variableOpex + workover + gasInjectionCost;
            } else {
                // Simple Model: % of Revenue + gas injection if in detailed production mode
                opex = revenue * (opexMargin / 100) + gasInjectionCost;
            }

            if (platformOwnership === 'chartered') {
                // Afretamento indexado à inflação (padrão de mercado para manter valor real)
                charterCost = annualCharterCost * (params.charterInflationAdjusted !== false ? inflationFactor : 1);
            }

            if (depreciationMode === 'simple') {
                if (productionYear <= depreciationYears) {
                    const charge = capexForConstruction / depreciationYears;
                    if (accumulatedDepreciation.simple + charge <= capexForConstruction) {
                        depreciation = charge;
                        accumulatedDepreciation.simple += charge;
                    } else {
                        depreciation = Math.max(0, capexForConstruction - accumulatedDepreciation.simple);
                        accumulatedDepreciation.simple += depreciation;
                    }
                }
            } else {
                const calculateCharge = (category) => {
                    const config = depreciationConfig[category];
                    const base = assetBase[category];
                    const currentAccum = accumulatedDepreciation[category];
                    let charge = 0;

                    if (base > 0) {
                        if (config.method === 'uop') {
                            if (totalReserves > 0) {
                                charge = base * (productionMMbbl / totalReserves);
                            }
                        } else {
                            let yearsToDepreciate = config.years;
                            if (productionYear <= yearsToDepreciate) {
                                charge = base / yearsToDepreciate;
                            }
                        }

                        if (currentAccum + charge > base) {
                            charge = Math.max(0, base - currentAccum);
                        }
                        accumulatedDepreciation[category] += charge;
                    }
                    return charge;
                };

                depreciation += calculateCharge('platform');
                depreciation += calculateCharge('wells');
                depreciation += calculateCharge('subsea');
            }

            royalties = revenue * (royaltiesRate / 100);
            const commonDeductions = opex + charterCost + depreciation;

            // --- LÓGICA DE PREJUÍZO FISCAL (COMMON FOR ALL REGIMES) ---
            // Primeiro checamos se há prejuízo OPERACIONAL no regime específico antes do IR/CSLL

            let taxableIncomeBeforeLoss = 0;

            if (taxRegime === 'concession') {
                const netRevenueForPE = revenue - royalties - commonDeductions;
                if (netRevenueForPE > 0) {
                    specialParticipation = netRevenueForPE * (specialParticipationRate / 100);
                }
                taxableIncomeBeforeLoss = netRevenueForPE - specialParticipation;

                // Base de cálculo do IR
                if (taxableIncomeBeforeLoss < 0) {
                    accumulatedLoss += Math.abs(taxableIncomeBeforeLoss);
                    corporateTax = 0;
                } else {
                    // Compensação de Prejuízos (Regra simplificada: 100% ou Regra BR: 30%?)
                    // Para garantir o efeito VPL da depreciação acelerada, usamos a lógica padrão de compensação.
                    // Adotando regra de trava de 30% (padrão Brasil) para maior realismo:
                    const limit = taxableIncomeBeforeLoss * 0.30; // Trava de 30% (Lei 8.981/95)

                    const lossUsage = Math.min(accumulatedLoss, limit);
                    accumulatedLoss -= lossUsage;
                    const finalTaxable = taxableIncomeBeforeLoss - lossUsage;

                    corporateTax = finalTaxable * (corporateTaxRate / 100);
                }
                taxes = royalties + specialParticipation + corporateTax;

            } else if (taxRegime === 'sharing') {
                const costRecoveryLimit = revenue * (costOilCap / 100);
                const recoverableExpenses = capex + opex + charterCost; // Capex here is simplified cash view, but sharing contract has specific rules. Keeping consistent with previous logic.
                accumulatedRecoverableCost += recoverableExpenses;
                const recoveredCost = Math.min(accumulatedRecoverableCost, costRecoveryLimit);
                accumulatedRecoverableCost -= recoveredCost;

                const profitOil = Math.max(0, revenue - royalties - recoveredCost);
                profitOilGov = profitOil * (profitOilGovShare / 100);

                // No regime de partilha, IR/CSLL incide sobre o lucro da empresa
                // Receita Liq - Deduções - ProfitOilGov
                taxableIncomeBeforeLoss = revenue - royalties - profitOilGov - commonDeductions;

                if (taxableIncomeBeforeLoss < 0) {
                    accumulatedLoss += Math.abs(taxableIncomeBeforeLoss);
                    corporateTax = 0;
                } else {
                    // Trava de 30% também se aplica aqui (Lucro Real)
                    const limit = taxableIncomeBeforeLoss * 0.30;
                    const lossUsage = Math.min(accumulatedLoss, limit);
                    accumulatedLoss -= lossUsage;
                    const finalTaxable = taxableIncomeBeforeLoss - lossUsage;

                    corporateTax = finalTaxable * (corporateTaxRate / 100);
                }

                taxes = royalties + profitOilGov + corporateTax;

            } else if (taxRegime === 'transfer_rights') {
                taxableIncomeBeforeLoss = revenue - royalties - commonDeductions;

                if (taxableIncomeBeforeLoss < 0) {
                    accumulatedLoss += Math.abs(taxableIncomeBeforeLoss);
                    corporateTax = 0;
                } else {
                    // Trava de 30%
                    const limit = taxableIncomeBeforeLoss * 0.30;
                    const lossUsage = Math.min(accumulatedLoss, limit);
                    accumulatedLoss -= lossUsage;
                    const finalTaxable = taxableIncomeBeforeLoss - lossUsage;

                    corporateTax = finalTaxable * (corporateTaxRate / 100);
                }

                taxes = royalties + corporateTax;
            }
        }

        const freeCashFlow = revenue - opex - charterCost - taxes - capex;
        const previousAccumulated = year > 0 ? data[year - 1].accumulatedCashFlow : 0;

        // Calculate Discounted Cash Flow for this year
        const discountedCashFlow = freeCashFlow / Math.pow(1 + discountRate / 100, year);
        accumulatedDiscountedCashFlow += discountedCashFlow;

        // Benefício Fiscal Potencial (Nominal) da Depreciação = Depreciação * Alíquota
        // Nota: O benefício real depende do lucro tributável e prejuízo acumulado, 
        // mas para fins de visualização de "Potencial de Economia", usa-se o nominal.
        const depreciationTaxShield = depreciation * (corporateTaxRate / 100);

        // --- SANITIZAÇÃO FINAL ---
        // Garante que nenhum valor seja NaN ou Infinity antes de ser enviado aos gráficos

        // Sanitize freeCashFlow before pushing to vector (CRITICAL FIX)
        const safeFreeCashFlow = safeNumber(freeCashFlow);
        cashFlowsVector.push(safeFreeCashFlow);

        // --- DEBUGGING ---
        // ----------------

        data.push({
            year,
            capex: safeNumber(-capex),
            revenue: safeNumber(revenue),
            opex: safeNumber(-opex),
            charterCost: safeNumber(-charterCost),
            taxes: safeNumber(-taxes),
            royalties: safeNumber(-royalties),
            specialParticipation: safeNumber(-specialParticipation),
            profitOilGov: safeNumber(-profitOilGov),
            corporateTax: safeNumber(-corporateTax),
            depreciation: safeNumber(-depreciation),
            capexTax: safeNumber(-capexTax),
            depreciationTaxShield: safeNumber(depreciationTaxShield),
            freeCashFlow: safeFreeCashFlow,
            discountedCashFlow: safeNumber(discountedCashFlow),
            accumulatedCashFlow: safeNumber(previousAccumulated + safeFreeCashFlow),
            accumulatedDiscountedCashFlow: safeNumber(accumulatedDiscountedCashFlow),
            isDecomYear,
            brentPrice: safeNumber(yearlyBrent),
            productionVolume: safeNumber(productionVolume),
            waterVolume: safeNumber(waterVolume),
            liquidVolume: safeNumber(liquidVolume),
            bsw: safeNumber(currentBSW)
        });
    }

    const vpl = safeNumber(calculateNPV(discountRate, cashFlowsVector));
    const tirRaw = calculateIRR(cashFlowsVector);
    const tir = (tirRaw !== null && Number.isFinite(tirRaw)) ? tirRaw : null;
    const paybackRaw = calculateDiscountedPayback(discountRate, cashFlowsVector);
    const payback = (paybackRaw !== null && Number.isFinite(paybackRaw)) ? paybackRaw : null;
    const vpl_ia = (discountedCapexSum > 0 && Number.isFinite(vpl)) ? vpl / discountedCapexSum : 0;
    const spread = (tir !== null && Number.isFinite(discountRate)) ? tir - discountRate : null;

    const npvProfile = [];
    for (let r = 0; r <= 40; r += 5) {
        npvProfile.push({ rate: r, npv: safeNumber(calculateNPV(r, cashFlowsVector)) });
    }

    return {
        yearlyData: data,
        metrics: {
            vpl,
            tir,
            payback,
            vpl_ia: safeNumber(vpl_ia),
            ia: safeNumber(discountedCapexSum),
            spread
        },
        cashFlowsVector,
        npvProfile,
        brentCurve,
        effectiveTotalCapex: safeNumber(totalCapex)
    };
};
