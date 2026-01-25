import { useMemo } from 'react';
import { generateProjectData } from '../utils/calculations';

export const useProjectCalculations = (params) => {
    return useMemo(() => {
        // 1. Cenário Base
        const baseResults = generateProjectData(params);

        // 2. Sensibilidade CAPEX
        const capexSensitivityData = [];
        const variations = [-30, -20, -10, 0, 10, 20, 30];

        variations.forEach(variation => {
            const simCapex = params.totalCapex * (1 + variation / 100);
            const simParams = { ...params, totalCapex: simCapex };
            const simResults = generateProjectData(simParams);

            if (simResults.metrics.tir !== null) {
                const spread = simResults.metrics.tir - params.discountRate;

                capexSensitivityData.push({
                    variation: variation,
                    capex: simCapex,
                    tir: simResults.metrics.tir,
                    spread: spread,
                    vpl_ia: simResults.metrics.vpl_ia,
                    isBase: variation === 0
                });
            }
        });
        capexSensitivityData.sort((a, b) => a.spread - b.spread);

        // 3. Brent de Equilíbrio (Solver)
        let breakevenBrent = null;
        let low = 0;
        let high = 200;
        let iterations = 0;

        // Algoritmo de bisseção para encontrar VPL ~= 0
        while (iterations < 20) {
            const mid = (low + high) / 2;
            // Força preço constante para o solver
            const tempParams = { ...params, brentPrice: mid, brentStrategy: 'constant' };
            const res = generateProjectData(tempParams);
            const npv = res.metrics.vpl;

            if (Math.abs(npv) < 1000) { // Tolerância de $1k
                breakevenBrent = mid;
                break;
            }

            if (npv > 0) {
                high = mid; // Preciso de preço menor para baixar o VPL
            } else {
                low = mid; // Preciso de preço maior para subir o VPL
            }
            iterations++;
        }
        if (!breakevenBrent) breakevenBrent = (low + high) / 2; // Fallback

        // Adicionar breakeven às métricas
        baseResults.metrics.breakevenBrent = breakevenBrent;

        return {
            ...baseResults,
            capexSensitivityData
        };
    }, [params]);
};
