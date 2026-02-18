
import { generateProjectData } from '../utils/calculations';

export function runMonteCarloScatter(params, iterations = 500) {
    const monteCarloData = [];

    // Função auxiliar para variação aleatória (+/- range%)
    const vary = (val, rangePercent) => val * (1 + (Math.random() * rangePercent * 2 - rangePercent) / 100);
    // Função para valor inteiro aleatório entre min e max inclusivos
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    for (let i = 0; i < iterations; i++) {
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
        // Fallback for trendline if nMc <= 1
        trendLine = [];
    }

    return {
        monteCarloData,
        mcCorrelation,
        trendLine
    };
}
