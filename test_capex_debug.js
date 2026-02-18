
const { generateProjectData } = require('./src/utils/calculations');

// Mock Data reproducing the issue
const params = {
    totalCapex: 4244, // $4.2B total (3044 FPSO + 800 Wells + 400 Subsea)
    capexSplit: { platform: 71.7, wells: 18.8, subsea: 9.4 }, // Approx split
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
};

const result = generateProjectData(params);

console.log('--- TEST RESULTS ---');
// Sum the discounted CAPEX to see total outflow
const totalDiscountedCapex = result.metrics.totalCapexDiscounted || 0; // The function doesn't return this metric directly? 
// We can sum from yearlyData

let totalCapexCashFlow = 0;
result.yearlyData.forEach(y => {
    // Reconstruct CAPEX from cash flow parts if needed, or check logs
    // But yearlyData has 'capex' field which is the outflow.
    // wait, yearlyData is the return? calculations.js returns { yearlyData, metrics } ?
    // Check calculations.js return signature.
});

// Actually calculations.js returns:
// return {
//     yearlyData: data,
//     metrics: { ... },
//     ...
// };
// And yearly data has: { year, capex, ... }

const totalCapexNominal = result.yearlyData.reduce((acc, y) => acc + (y.capex || 0), 0);
console.log(`Total CAPEX Outflow (Nominal): $${(totalCapexNominal / 1000000).toFixed(0)}M`);

// Expected: Approx 1200M (Wells + Subsea) + Taxes
// If Buggy: Approx 4244M + Taxes + Charter Costs
// Or 4244M reallocated to Wells/Subsea.

// Let's also check Detailed Depreciation Base if possible
// It's not returned directly, but we can infer from total depreciation if simple mode
