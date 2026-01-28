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

        // 4. Simulação Monte Carlo (Multivariada)
        const monteCarloData = [];
        const mcIterations = 50;

        for (let i = 0; i < mcIterations; i++) {
            // Função auxiliar para variação aleatória (+/- range%)
            const vary = (val, rangePercent) => val * (1 + (Math.random() * rangePercent * 2 - rangePercent) / 100);
            // Função para valor inteiro aleatório entre min e max inclusivos
            const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            const simParams = { ...params };

            // Variação de Parâmetros
            simParams.totalCapex = vary(params.totalCapex, 20); // +/- 20%
            simParams.capexConcentration = Math.min(100, Math.max(0, vary(params.capexConcentration, 30)));
            simParams.capexPeakRelative = Math.max(1, Math.min(params.capexDuration, randomInt(1, params.capexDuration)));

            simParams.peakProduction = vary(params.peakProduction, 20);
            simParams.rampUpDuration = Math.max(1, randomInt(Math.max(1, params.rampUpDuration - 1), params.rampUpDuration + 2));
            simParams.plateauDuration = Math.max(1, randomInt(Math.max(1, params.plateauDuration - 1), params.plateauDuration + 2));
            simParams.declineRate = vary(params.declineRate, 20);

            simParams.opexMargin = vary(params.opexMargin, 20);
            simParams.opexFixed = vary(params.opexFixed, 15);
            simParams.opexVariable = vary(params.opexVariable, 15);

            // Recalcula projeto
            // Importante: recalcular pico se depender de reservas? 
            // Neste caso, assumimos que peakProduction variou independentemente ou foi recalculado. 
            // Se o simulador usa parâmetros para derivar outros, idealmente usaríamos as funções de ajuste.
            // Para simplicidade, variamos os inputs diretos.

            const simResults = generateProjectData(simParams);

            if (simResults.metrics.tir !== null && isFinite(simResults.metrics.vpl_ia)) {
                const spread = simResults.metrics.tir - params.discountRate;
                monteCarloData.push({
                    id: i,
                    spread: spread,
                    vpl_ia: simResults.metrics.vpl_ia
                });
            }
        }

        // Estatísticas Monte Carlo
        let mcCorrelation = 0;
        let trendLine = [];
        const nMc = monteCarloData.length;

        if (nMc > 1) {
            const sumX = monteCarloData.reduce((acc, item) => acc + item.spread, 0);
            const sumY = monteCarloData.reduce((acc, item) => acc + item.vpl_ia, 0);
            const sumXY = monteCarloData.reduce((acc, item) => acc + (item.spread * item.vpl_ia), 0);
            const sumX2 = monteCarloData.reduce((acc, item) => acc + (item.spread * item.spread), 0);
            const sumY2 = monteCarloData.reduce((acc, item) => acc + (item.vpl_ia * item.vpl_ia), 0);

            const numerator = (nMc * sumXY) - (sumX * sumY);
            const denominator = Math.sqrt(((nMc * sumX2) - (sumX * sumX)) * ((nMc * sumY2) - (sumY * sumY)));

            if (denominator !== 0) {
                mcCorrelation = numerator / denominator;
            }

            // Regressão Linear Simples para Linha de Tendência (y = mx + b)
            const m = ((nMc * sumXY) - (sumX * sumY)) / ((nMc * sumX2) - (sumX * sumX));
            const b = (sumY - m * sumX) / nMc;

            // Pontos extremos para traçar a reta
            const minSpread = Math.min(...monteCarloData.map(d => d.spread));
            const maxSpread = Math.max(...monteCarloData.map(d => d.spread));

            trendLine = [
                { spread: minSpread, vpl_ia: m * minSpread + b },
                { spread: maxSpread, vpl_ia: m * maxSpread + b }
            ];
        } else {
            // Fallback se não gerar pontos suficientes
            trendLine = [];
        }

        // Adicionar breakeven às métricas
        baseResults.metrics.breakevenBrent = breakevenBrent;

        // Calcular Correlação de Pearson (r)
        let sensitivityCorrelation = 0;
        const n = capexSensitivityData.length;
        if (n > 1) {
            const sumX = capexSensitivityData.reduce((acc, item) => acc + item.spread, 0);
            const sumY = capexSensitivityData.reduce((acc, item) => acc + item.vpl_ia, 0);
            const sumXY = capexSensitivityData.reduce((acc, item) => acc + (item.spread * item.vpl_ia), 0);
            const sumX2 = capexSensitivityData.reduce((acc, item) => acc + (item.spread * item.spread), 0);
            const sumY2 = capexSensitivityData.reduce((acc, item) => acc + (item.vpl_ia * item.vpl_ia), 0);

            const numerator = (n * sumXY) - (sumX * sumY);
            const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

            if (denominator !== 0) {
                sensitivityCorrelation = numerator / denominator;
            }
        }

        return {
            ...baseResults,
            capexSensitivityData,
            sensitivityCorrelation,
            monteCarloData,
            mcCorrelation,
            trendLine
        };
    }, [params]);
};
