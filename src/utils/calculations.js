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

export const calculateNPV = (rate, cashFlows) => {
    return cashFlows.reduce((acc, val, t) => acc + val / Math.pow(1 + rate / 100, t), 0);
};

export const calculateDiscountedPayback = (rate, cashFlows) => {
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
        capexDuration,
        capexPeakRelative, capexConcentration,
        peakProduction, brentSpread,
        rampUpDuration, plateauDuration, declineRate, opexMargin,
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
        charterSplitPercent,
        repetroRatio = { platform: 100, wells: 100, subsea: 100 },
        capexTaxRate = 40
    } = params;

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
        if (r > 0 && n > 0) {
            annualCharterCost = (charterPV * r) / (1 - Math.pow(1 + r, -n));
        } else if (n > 0) {
            annualCharterCost = charterPV / n;
        }

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
    const peakIndex = (capexDuration - 1) * capexPeakRelative;
    const sigma = Math.max(0.1, (capexDuration) / (capexConcentration || 1));
    for (let i = 0; i < capexDuration; i++) {
        const w = Math.exp(-Math.pow(i - peakIndex, 2) / (2 * sigma * sigma));
        capexWeights.push(w);
        weightSum += w;
    }

    const decommissioningCost = totalCapex * 0.15; // Decom sobre valor original (sem impostos)

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

        let royalties = 0;
        let specialParticipation = 0;
        let profitOilGov = 0;
        let corporateTax = 0;

        if (year < capexDuration) {
            const weight = capexWeights[year] / weightSum;
            const capexBase = constructionCapexTotal * weight;
            // Imposto Proporcional ao desembolso
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
            if (productionYear <= rampUpDuration) {
                productionVolume = peakProduction * (productionYear / rampUpDuration);
            } else if (productionYear <= rampUpDuration + plateauDuration) {
                productionVolume = peakProduction;
            } else {
                const yearsPostPlateau = productionYear - (rampUpDuration + plateauDuration);
                productionVolume = peakProduction * Math.pow(1 - declineRate / 100, yearsPostPlateau);
            }

            productionMMbbl = (productionVolume * 1000 * 365) / 1000000;
            revenue = productionMMbbl * 1000000 * netOilPrice;
            opex = revenue * (opexMargin / 100);

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
                    const limit = taxableIncomeBeforeLoss * 1.0; // Usando 100% para maximizar o efeito didático da depreciação, ou mudar para 0.3 se quiser realismo BR. Vamos de 100% por enquanto para corrigir o "bug" lógico do usuário.

                    const lossUsage = Math.min(accumulatedLoss, limit); // Se quiser travar em 30%: Math.min(accumulatedLoss, taxableIncomeBeforeLoss * 0.30);
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
                    const lossUsage = Math.min(accumulatedLoss, taxableIncomeBeforeLoss);
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
                    const lossUsage = Math.min(accumulatedLoss, taxableIncomeBeforeLoss);
                    accumulatedLoss -= lossUsage;
                    const finalTaxable = taxableIncomeBeforeLoss - lossUsage;

                    corporateTax = finalTaxable * (corporateTaxRate / 100);
                }

                taxes = royalties + corporateTax;
            }
        }

        const freeCashFlow = revenue - opex - charterCost - taxes - capex;
        const previousAccumulated = year > 0 ? data[year - 1].accumulatedCashFlow : 0;

        data.push({
            year,
            capex: -capex,
            revenue,
            opex: -opex,
            charterCost: -charterCost,
            taxes: -taxes,
            royalties: -royalties,
            specialParticipation: -specialParticipation,
            profitOilGov: -profitOilGov,
            depreciation: -depreciation,
            capexTax: -capexTax,
            freeCashFlow,
            accumulatedCashFlow: previousAccumulated + freeCashFlow,
            isDecomYear,
            brentPrice: yearlyBrent,
            productionVolume
        });

        cashFlowsVector.push(freeCashFlow);
    }

    const vpl = calculateNPV(discountRate, cashFlowsVector);
    const tir = calculateIRR(cashFlowsVector);
    const payback = calculateDiscountedPayback(discountRate, cashFlowsVector);
    const vpl_ia = discountedCapexSum > 0 ? vpl / discountedCapexSum : 0;
    const spread = tir !== null ? tir - discountRate : null;

    const npvProfile = [];
    for (let r = 0; r <= 40; r += 5) {
        npvProfile.push({ rate: r, npv: calculateNPV(r, cashFlowsVector) });
    }

    return {
        yearlyData: data,
        metrics: { vpl, tir, payback, vpl_ia, ia: discountedCapexSum, spread },
        cashFlowsVector,
        npvProfile,
        brentCurve,
        effectiveTotalCapex: totalCapex
    };
};
