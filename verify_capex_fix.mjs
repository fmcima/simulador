
import { generateProjectData } from './src/utils/calculations.js';

// Mock Data reproducing the issue
const params = {
    totalCapex: 4244, // $4.2B total (3044 FPSO + 800 Wells + 400 Subsea)
    capexSplit: { platform: 71.7, wells: 18.8, subsea: 9.4 }, // Approx split matching above total
    platformOwnership: 'chartered',
    charterPV: 2500, // $2.5B PV of Charter
    discountRate: 10,
    projectDuration: 25,
    capexDuration: 5,

    // Minimal params to run
    peakProduction: 180,
    rampUpDuration: 4,
    plateauDuration: 4,
    declineRate: 10,
    brentPrice: 70,
    brentStrategy: 'constant',
    taxRegime: 'concession',
    royaltiesRate: 10,
    specialParticipationRate: 0,
    corporateTaxRate: 34,

    // Repetro
    repetroRatio: { platform: 100, wells: 100, subsea: 100 }, // Assume 0 tax for simplicity
    capexTaxRate: 40
};

const result = generateProjectData(params);

console.log('--- VERIFICATION RESULTS ---');

const totalCapexNominal = result.yearlyData.reduce((acc, y) => acc + (y.capex || 0), 0);
console.log(`Total CAPEX Outflow (Nominal): $${(totalCapexNominal / 1000000).toFixed(0)}M`);

// Expected Calculation:
// Total Capex = 4244
// Wells Share = 18.8% -> 4244 * 0.188 = 797.8
// Subsea Share = 9.4% -> 4244 * 0.094 = 398.9
// Total Operator Capex = 797.8 + 398.9 = ~1197M
// With 100% Repetro, Tax should be 0.
// Expected Outflow ~ 1200M

if (totalCapexNominal > 3000000000) {
    console.error('FAIL: CAPEX seems to include FPSO cost (Double Counting)');
    process.exit(1);
} else if (totalCapexNominal < 1000000000) {
    console.error('FAIL: CAPEX seems too low');
    process.exit(1);
} else {
    console.log('SUCCESS: CAPEX is within expected range for chartered project');
}
