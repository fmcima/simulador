
// reproduce_issue.js

/**
 * Simplified reproduction of the NPV anomaly.
 * Scenario: Project has positive cash flows until year 21, then negative until year 30.
 * Anomaly: Reducing duration from 30 to 25 years DECREASES NPV, even though we cut off 5 years of losses.
 * Hypothesis: Use of Decommissioning Cost (Abex) at end of project is the cause.
 */

function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, val, t) => acc + val / Math.pow(1 + rate / 100, t), 0);
}

function runSimulation(duration) {
    const discountRate = 10;
    const totalCapex = 7000; // $7 Billion
    const decomRate = 0.15; // 15% of Capex
    const decomCost = totalCapex * decomRate;

    const cashFlows = [];

    // Year 0-5: Investment (Negative Cash Flow)
    // Simplified: Just put some heavy negative flow early on
    for (let i = 0; i <= duration; i++) {
        let flow = 0;

        if (i === 0) flow = -1000; // Initial setup
        else if (i <= 5) flow = -1000; // Capex phase
        else if (i <= 21) flow = 800; // Positive generation
        else flow = -50; // Late life negative flow (maintenance > revenue)

        cashFlows.push(flow);
    }

    // Decommissioning happens at Duration + 1
    // We add it to the last year or append a new year. 
    // In the real app logic: "isDecomYear = (year === projectDuration + 1)"
    const decomYear = duration + 1;
    // Ensure array is long enough
    while (cashFlows.length <= decomYear) cashFlows.push(0);

    cashFlows[decomYear] -= decomCost;

    const npv = calculateNPV(discountRate, cashFlows);
    const decomPV = -decomCost / Math.pow(1 + discountRate / 100, decomYear);

    return {
        duration,
        npv,
        decomYear,
        decomCost,
        decomPV,
        sumNegativeFlowsTail: duration > 21 ? (duration - 21) * -50 : 0
    };
}

const sim30 = runSimulation(30);
const sim25 = runSimulation(25);

console.log("--- Results ---");
console.log("30 Years NPV:", sim30.npv.toFixed(2));
console.log("25 Years NPV:", sim25.npv.toFixed(2));
console.log("Difference:", (sim30.npv - sim25.npv).toFixed(2));

console.log("\n--- Analysis of Decommissioning Cost (Abex) ---");
console.log(`Abex Value (Nominal): ${sim30.decomCost}`);
console.log(`PV of Abex at Year 31 (30y case): ${sim30.decomPV.toFixed(2)}`);
console.log(`PV of Abex at Year 26 (25y case): ${sim25.decomPV.toFixed(2)}`);
console.log(`Impact of Acceleration (Loss): ${(sim25.decomPV - sim30.decomPV).toFixed(2)}`);

console.log("\n--- Analysis of Avoided Losses ---");
// We avoided 5 years (26-30) of -50 flow
// Simplified PV of those avoided losses
let avoidedLossPV = 0;
for (let t = 26; t <= 30; t++) {
    const flow = -50;
    avoidedLossPV += flow / Math.pow(1 + 10 / 100, t);
}
console.log(`PV of Avoided Tail Losses (Benefit): ${(-avoidedLossPV).toFixed(2)}`); // Negative of negative is benefit

console.log("\n--- Conclusion ---");
const netEffect = (sim25.decomPV - sim30.decomPV) - avoidedLossPV;
console.log(`Net Effect on NPV: ${netEffect.toFixed(2)}`);
if (netEffect < 0) console.log("The cost of accelerating Abex outweighs the benefit of cutting losses -> NPV decreases.");
else console.log("Cutting losses outweighs Abex acceleration -> NPV increases.");
