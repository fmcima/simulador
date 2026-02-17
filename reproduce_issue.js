
// Mock of the implementation in calculations.js
const calculateDiscountedPayback = (rate, cashFlows) => {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
        const discountedVal = cashFlows[t] / Math.pow(1 + rate / 100, t);
        const previousCum = cumulative;
        cumulative += discountedVal; // Corrected: summing discounted values
        if (cumulative >= 0) {
            if (t === 0) return 0;
            return t - 1 + Math.abs(previousCum) / discountedVal;
        }
    }
    return null;
};

// Simple Payback (Nominal)
const calculateNominalPayback = (cashFlows) => {
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

// Simulation Data Validation
// Use a synthetic cash flow that resembles a project
// Year 0-4: Capex (Negative)
// Year 5+: Production (Positive)

const generateSyntheticFlow = () => {
    const flows = [];
    const discountRate = 10;

    // Year 0: -500
    // Year 1: -1000
    // Year 2: -1500
    // Year 3: -1000
    // Year 4: -500
    // Total Capex: -4500

    for (let i = 0; i < 5; i++) flows.push(-900); // Concentrated

    // Production Years 5 to 30
    // Revenue ramps up then declines
    for (let i = 5; i < 35; i++) {
        let revenue = 1000;
        if (i > 10) revenue = 1000 * Math.pow(0.9, i - 10); // Decline
        flows.push(revenue - 200); // 200 opex
    }

    return { flows, discountRate };
}

const runTest = () => {
    const { flows, discountRate } = generateSyntheticFlow();

    console.log("--- Synthetic Data Test ---");
    console.log("Discount Rate:", discountRate);

    // Calculate Nominal Accumulation Curve (for chart)
    const nominalCurve = [];
    let cum = 0;
    flows.forEach((f, i) => {
        cum += f;
        nominalCurve.push({ t: i, flow: f, cum });
    });

    // Calculate Paybacks
    const discPayback = calculateDiscountedPayback(discountRate, flows);
    const nomPayback = calculateNominalPayback(flows);

    console.log(`Discounted Payback (KPI): ${discPayback?.toFixed(2)} years`);
    console.log(`Nominal Payback (Chart): ${nomPayback?.toFixed(2)} years`);

    // Check Crossing Points manually
    const crossNom = nominalCurve.find(x => x.cum >= 0);
    console.log(`Nominal Crosses Positive at Year: ${crossNom?.t}`);

    const discountedCurve = [];
    let discCum = 0;
    flows.forEach((f, i) => {
        const dF = f / Math.pow(1 + discountRate / 100, i);
        discCum += dF;
        discountedCurve.push({ t: i, flow: dF, cum: discCum });
    });

    const crossDisc = discountedCurve.find(x => x.cum >= 0);
    console.log(`Discounted Crosses Positive at Year: ${crossDisc?.t}`);

    if (discPayback < nomPayback) {
        console.warn("!!! ANOMALY DETECTED: Discounted Payback is FASTER than Nominal !!!");
    } else {
        console.log("Normal Behavior: Discounted Payback is SLOWER than Nominal.");
    }
}

runTest();
