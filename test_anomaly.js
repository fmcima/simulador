
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

// Test Case
const cashFlows = [
    -500, -1000, -1500, -1000, -500, // Investment Years 0-4
    200, 400, 600, 800, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000 // Returns
];
const rate = 10;

const dP = calculateDiscountedPayback(rate, cashFlows);
const nP = calculateNominalPayback(cashFlows);

console.log("Discounted Payback:", dP);
console.log("Nominal Payback:", nP);

if (dP < nP) {
    console.log("ANOMALY: Discounted < Nominal");
} else {
    console.log("NORMAL: Discounted >= Nominal");
}

// Log accumulation details
let dCum = 0;
let nCum = 0;
for (let t = 0; t < cashFlows.length; t++) {
    const val = cashFlows[t];
    const dVal = val / Math.pow(1 + rate / 100, t);
    dCum += dVal;
    nCum += val;
    console.log(`Year ${t}: Flow=${val}, NomCum=${nCum.toFixed(0)}, DiscCum=${dCum.toFixed(0)}`);
}
