
// --- COPY OF CALCULATIONS.JS ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        notation: value > 1000000 ? 'compact' : 'standard'
    }).format(value);
};

const formatBillions = (value) => {
    const inBillions = value / 1000000000;
    return `$${inBillions.toFixed(2)}B`;
};

const formatMillionsNoDecimals = (value) => {
    const inMillions = value / 1000000;
    return `$${inMillions.toFixed(0)}M`;
};

const getTimeDependentLambda = (lambdaAvg, year, projectDuration, growthFactor = 1.5) => {
    if (!lambdaAvg || lambdaAvg === 0) return 0;
    const normalizedTime = year / Math.max(projectDuration - 1, 1);
    const multiplier = 1 + growthFactor * (normalizedTime - 0.5);
    return Math.max(0, lambdaAvg * multiplier);
};

const calculateNPV = (rate, cashFlows) => {
    return cashFlows.reduce((acc, val, t) => acc + val / Math.pow(1 + rate / 100, t), 0);
};

const calculateDiscountedPayback = (rate, cashFlows) => {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        const discountedVal = cashFlows[t] / Math.pow(1 + rate / 100, t);
        const previousCum = cumulative;
        cumulative += discountedVal;
        if (cumulative >= 0) {
            if (t === 0) return 0;
            return t - 1 + Math.abs(previousCum) / discountedVal;
        }
    }
    return null;
};

const calculateNominalPaybackManual = (cashFlows) => {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        const val = cashFlows[t];
        const previousCum = cumulative;
        cumulative += val;
        if (cumulative >= 0) {
            if (t === 0) return 0;
            return t - 1 + Math.abs(previousCum) / val;
        }
    }
    return null;
};

const calculateIRR = (cashFlows, guess = 0.1) => {
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

const getBrentCurve = (params, duration) => {
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
            const peakY = brentPeakYear || 5;
            const peakV = brentPeakValue || 90;
            const longTerm = brentLongTerm || 60;

            if (year <= peakY) {
                if (peakY === 0) price = peakV;
                else price = brentPrice + (peakV - brentPrice) * (year / peakY);
            } else {
                const decayFactor = 0.15;
                const delta = peakV - longTerm;
                price = longTerm + delta * Math.exp(-decayFactor * (year - peakY));
            }
        }
        curve.push(price);
    }
    return curve;
};

const calculatePeakFromReserves = (totalReservesMMbbl, rampUp, plateau, decline, duration) => {
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

const generateProjectData = (params) => {
    const {
        totalCapex,
        capexDuration,
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

    const data = [];
    let cashFlowsVector = [];
    let discountedCapexSum = 0;

    const brentCurve = getBrentCurve(params, projectDuration);

    const splitTotal = capexSplit.platform + capexSplit.wells + capexSplit.subsea;
    const normPlatform = capexSplit.platform / splitTotal;
    const normWells = capexSplit.wells / splitTotal;
    const normSubsea = capexSplit.subsea / splitTotal;

    const repetro = typeof repetroRatio === 'object' ? repetroRatio : { platform: repetroRatio, wells: repetroRatio, subsea: repetroRatio };

    const taxSharePlatform = normPlatform * (1 - repetro.platform / 100) * (capexTaxRate / 100);
    const taxShareWells = normWells * (1 - repetro.wells / 100) * (capexTaxRate / 100);
    const taxShareSubsea = normSubsea * (1 - repetro.subsea / 100) * (capexTaxRate / 100);

    const effectiveTaxRate = taxSharePlatform + taxShareWells + taxShareSubsea;

    const capexTaxTotal = totalCapex * effectiveTaxRate;
    const effectiveTotalCapex = totalCapex + capexTaxTotal;

    let capexForConstruction = effectiveTotalCapex;
    let annualCharterCost = 0;

    let assetBase = {
        platform: 0,
        wells: 0,
        subsea: 0
    };

    if (platformOwnership === 'chartered') {
        const r = discountRate / 100;
        const n = projectDuration;
        const pv = Number(charterPV) || 0;
        let baseAnnualCharter = 0;
        if (r > 0 && n > 0) {
            baseAnnualCharter = (pv * r) / (1 - Math.pow(1 + r, -n));
        } else if (n > 0) {
            baseAnnualCharter = pv / n;
        }

        const cSplit = Number(charterSplit?.charter);
        const sSplit = Number(charterSplit?.service);
        const sTax = Number(serviceTaxRate);

        const safeCharterPct = (!isNaN(cSplit) ? cSplit : 85) / 100;
        const safeServicePct = (!isNaN(sSplit) ? sSplit : 15) / 100;
        const safeTaxRate = (!isNaN(sTax) ? sTax : 14.25) / 100;

        annualCharterCost = (baseAnnualCharter * safeCharterPct) + (baseAnnualCharter * safeServicePct * (1 + safeTaxRate));

        const nonPlatformSplitSum = capexSplit.wells + capexSplit.subsea;
        const factor = nonPlatformSplitSum > 0 ? 100 / nonPlatformSplitSum : 0;

        assetBase.platform = 0;
        assetBase.wells = effectiveTotalCapex * ((capexSplit.wells * factor) / 100);
        assetBase.subsea = effectiveTotalCapex * ((capexSplit.subsea * factor) / 100);

    } else {
        assetBase.platform = effectiveTotalCapex * (capexSplit.platform / 100);
        assetBase.wells = effectiveTotalCapex * (capexSplit.wells / 100);
        assetBase.subsea = effectiveTotalCapex * (capexSplit.subsea / 100);
    }

    const constructionCapexTotal = capexForConstruction * 0.85;
    const postOilCapexTotal = capexForConstruction * 0.15;

    let capexWeights = [];
    let weightSum = 0;
    const peakIndex = Math.max(0, Math.min(capexDuration - 1, (capexPeakRelative || capexDuration) - 1));
    const concentrationFactor = Math.max(1, capexConcentration / 10);
    const sigma = Math.max(0.1, (capexDuration) / concentrationFactor);
    for (let i = 0; i < capexDuration; i++) {
        const w = Math.exp(-Math.pow(i - peakIndex, 2) / (2 * sigma * sigma));
        capexWeights.push(w);
        weightSum += w;
    }

    let decommissioningCost = 0;

    if (params.abexMode === 'detailed') {
        const numWells = params.wellsParams?.numWells || 16;
        const abexPerWell = params.abexPerWell || 25000000;
        const wellsAbex = numWells * abexPerWell;

        const subseaCapex = totalCapex * (capexSplit.subsea / 100);
        const subseaAbexPct = params.abexSubseaPct || 25;
        const subseaAbex = subseaCapex * (subseaAbexPct / 100);
        const platformAbex = params.abexPlatform || 150000000;

        decommissioningCost = wellsAbex + subseaAbex + platformAbex;
    } else {
        const simpleRate = params.abexSimpleRate || 15;
        decommissioningCost = totalCapex * (simpleRate / 100);
    }

    let accumulatedDepreciation = { platform: 0, wells: 0, subsea: 0, simple: 0 };
    let accumulatedRecoverableCost = 0;
    let accumulatedLoss = 0;

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
            const capexBase = constructionCapexTotal * weight;
            const taxPart = capexBase * effectiveTaxRate;

            capex += capexBase + taxPart;
            capexTax += taxPart;
        }

        const productionYear = year - (capexDuration - 1);
        if (productionYear === 1 || productionYear === 2) {
            const capexBase = postOilCapexTotal / 2;
            const taxPart = capexBase * effectiveTaxRate;
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
            let effectiveDeclineRate = declineRate;

            if (productionYear <= rampUpDuration) {
                productionVolume = peakProduction * (productionYear / rampUpDuration);
            } else if (productionYear <= rampUpDuration + plateauDuration) {
                productionVolume = peakProduction;
            } else {
                const yearsPostPlateau = productionYear - (rampUpDuration + plateauDuration);
                const Di = effectiveDeclineRate / 100;
                const b = hyperbolicFactor;

                if (b === 0) {
                    productionVolume = peakProduction * Math.exp(-Di * yearsPostPlateau);
                } else {
                    const denominator = Math.pow(1 + b * Di * yearsPostPlateau, 1 / b);
                    productionVolume = peakProduction / denominator;
                }
            }

            if (productionMode === 'detailed') {
                productionVolume = productionVolume; // Simplification for reproduction
                liquidVolume = productionVolume;
            } else {
                liquidVolume = productionVolume;
            }

            productionMMbbl = (productionVolume * 1000 * 365) / 1000000;

            const apiPriceAdjustment = productionMode === 'detailed' ? 1 + ((oilAPI - 30) * 0.004) : 1;
            const adjustedOilPrice = netOilPrice * apiPriceAdjustment;
            revenue = productionMMbbl * 1000000 * adjustedOilPrice;

            let gasInjectionCost = 0;

            if (opexMode === 'detailed') {
                // Simplification for reproduction
                opex = 0;
            } else {
                opex = revenue * (opexMargin / 100) + gasInjectionCost;
            }

            if (platformOwnership === 'chartered') {
                charterCost = annualCharterCost;
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
                // Detailed Depreciation Logic simplified or full?
                // Full logic copied
                const calculateCharge = (category) => {
                    const config = depreciationConfig[category];
                    const base = assetBase[category];
                    const currentAccum = accumulatedDepreciation[category];
                    let charge = 0;

                    if (base > 0) {
                        // Simplify UOP to straight line for test or assume totalReserves matches
                        let yearsToDepreciate = config.years;
                        if (productionYear <= yearsToDepreciate) {
                            charge = base / yearsToDepreciate;
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

            let taxableIncomeBeforeLoss = 0;

            if (taxRegime === 'concession') {
                // ...
            } else if (taxRegime === 'sharing') {
                const costRecoveryLimit = revenue * (costOilCap / 100);
                const recoverableExpenses = capex + opex + charterCost;
                accumulatedRecoverableCost += recoverableExpenses;
                const recoveredCost = Math.min(accumulatedRecoverableCost, costRecoveryLimit);
                accumulatedRecoverableCost -= recoveredCost;

                const profitOil = Math.max(0, revenue - royalties - recoveredCost);
                profitOilGov = profitOil * (profitOilGovShare / 100);

                taxableIncomeBeforeLoss = revenue - royalties - profitOilGov - commonDeductions;

                if (taxableIncomeBeforeLoss < 0) {
                    accumulatedLoss += Math.abs(taxableIncomeBeforeLoss);
                    corporateTax = 0;
                } else {
                    const lossUsage = Math.min(accumulatedLoss, taxableIncomeBeforeLoss);
                    accumulatedLoss -= lossUsage;
                    const finalTaxable = taxableIncomeBeforeLoss - lossUsage;

                    corporateTax = finalTaxable * (corporateTaxRate / 100);
                }

                taxes = royalties + profitOilGov + corporateTax;
            }
        }

        const freeCashFlow = revenue - opex - charterCost - taxes - capex;
        const previousAccumulated = year > 0 ? data[year - 1].accumulatedCashFlow : 0;

        const depreciationTaxShield = depreciation * (corporateTaxRate / 100);

        data.push({
            year,
            capex: -capex,
            revenue,
            accumulatedCashFlow: previousAccumulated + freeCashFlow,
        });

        cashFlowsVector.push(freeCashFlow);
    }

    const vpl = calculateNPV(discountRate, cashFlowsVector);
    const tir = calculateIRR(cashFlowsVector);
    const payback = calculateDiscountedPayback(discountRate, cashFlowsVector);
    const normPayback = calculateNominalPaybackManual(cashFlowsVector);

    return {
        yearlyData: data,
        metrics: { vpl, tir, payback, normPayback },
    };
};

const defaultParams = {
    abexMode: 'simple',
    abexSimpleRate: 15,
    abexPerWell: 25000000,
    abexSubseaPct: 25,
    abexPlatform: 150000000,
    totalCapex: 6000000000,
    capexDuration: 5,
    capexPeakRelative: 4,
    capexConcentration: 50,
    platformOwnership: 'owned',
    charterPV: 2000000000,
    charterSplitPercent: 85,
    repetroRatio: { platform: 95, wells: 45, subsea: 75 },
    capexTaxRate: 40,
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
    hyperbolicFactor: 0.5,
    baseDeclineRate: 8,
    productionMode: 'simple',
    oilAPI: 28,
    gor: 150,
    maxLiquids: 252000,
    bswMax: 95,
    bswBreakthrough: 7,
    bswGrowthRate: 0.7,
    opexMargin: 15,
    opexMode: 'simple',
    opexFixed: 100000000,
    opexVariable: 4,
    workoverCost: 57600000,
    workoverLambda: 0.15,
    workoverMobCost: 8,
    workoverDuration: 20,
    workoverTesp: 90,
    workoverDailyRate: 800,
    costInflation: 2,
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
    fpsoParams: { mode: 'simple', simpleTotal: 2500 },
    wellsParams: { mode: 'simple', simpleTotal: 2000, numProducers: 8, numInjectors: 8 },
    subseaParams: { mode: 'simple', simpleTotal: 1200 },
};

const res = generateProjectData(defaultParams);
console.log(`Metrics: Payback (Discounted) = ${res.metrics.payback}, NormPayback = ${res.metrics.normPayback}`);
console.log(`Accumulated Cash Flow Cross Check from Data:`);
res.yearlyData.forEach(d => {
    if (d.year > 8 && d.year < 16) {
        console.log(`Year ${d.year}: Acc = ${d.accumulatedCashFlow.toFixed(0)}`);
    }
});
