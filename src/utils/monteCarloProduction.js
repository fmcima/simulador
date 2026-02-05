
import { generateProjectData } from './calculations';

/**
 * Monte Carlo Simulation for Production Curves
 * 
 * Generates probabilistic production volume curves (P10, P50, P90) based on
 * uncertain input parameters defined by triangular distributions.
 */

/**
 * Generates a random value using a Triangular Distribution
 * @param {number} min - Minimum value
 * @param {number} mode - Most likely value
 * @param {number} max - Maximum value
 * @returns {number} Random value
 */
function triangularSample(min, mode, max) {
    const u = Math.random();
    const f = (mode - min) / (max - min);

    if (u < f) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

/**
 * Calculates a single production curve for a given set of parameters
 * Based on the Arps Decline model used in the main application.
 * 
 * @param {Object} params - Scenario specific parameters
 * @param {number} duration - Simulation duration in years
 * @returns {Array<number>} Annual production volumes (MMbbl)
 */
function calculateScenarioCurve(params, duration = 30) {
    const { peak, plateau, decline, rampUp, productionMode, bswBreakthrough, bswGrowthRate, maxLiquids } = params;

    // Normalize decline to decimal
    const declineDecimal = decline / 100;

    // Using standard hyperbolic factor (b=0.5) as default if not randomized
    const b = 0.5;

    const yearlyProduction = [];

    // BSW Constants
    const BSW_max = 0.95; // 95%
    // t_bt is when BSW = 2%. t_inflection calculation:
    // 0.02 = 0.95 / (1 + exp(-k * (t_bt - t_inf))) -> t_inf = t_bt + ln((0.95/0.02) - 1) / k
    const ratio = (BSW_max / 0.02) - 1;
    const k = bswGrowthRate;
    const offset = (k > 0 && ratio > 0) ? Math.log(ratio) / k : 0;
    const t_inflection = bswBreakthrough + offset;
    const maxLiquidsKbpd = (maxLiquids || 200000) / 1000;

    // Assuming t starts at 1 (Year 1 of production)
    for (let t = 1; t <= duration; t++) {
        let volume = 0; // kbpd (Potential Oil)

        if (t <= rampUp) {
            // Ramp-up: Linear from 0 to Peak
            volume = peak * (t / rampUp);
        } else if (t <= rampUp + plateau) {
            // Plateau: Constant Peak
            volume = peak;
        } else {
            // Decline phase
            const t_decline = t - (rampUp + plateau);

            // Arps Hyperbolic: q(t) = qi / (1 + b * Di * t)^(1/b)
            if (b === 0) {
                volume = peak * Math.exp(-declineDecimal * t_decline);
            } else {
                const denominator = Math.pow(1 + b * declineDecimal * t_decline, 1 / b);
                volume = peak / denominator;
            }
        }

        // Apply BSW Constraint (Detailed Mode Only)
        if (productionMode === 'detailed') {
            // t is time since first oil
            const bsw = BSW_max / (1 + Math.exp(-k * (t - t_inflection)));
            const currentBSW = isNaN(bsw) ? 0 : bsw;

            // Oil Capacity Limit
            const maxOilFromLiquids = maxLiquidsKbpd * (1 - currentBSW);

            // Actual Oil is min(Potential, Capacity)
            volume = Math.min(volume, maxOilFromLiquids);
        }

        // Convert to Annual MMbbl (kbpd * 365 / 1000) -> * 0.365
        yearlyProduction.push(Math.max(0, volume * 0.365));
    }

    return yearlyProduction;
}

/**
 * Runs the Monte Carlo Simulation
 * 
 * @param {Object} baseParams - Current parameters from the UI
 * @param {Object} settings - Configuration for the Monte Carlo (ranges)
 * @param {number} iterations - Number of iterations (default 1000)
 * @returns {Object} { p10: [], p50: [], p90: [], reserves: { p10, p50, p90 } }
 */
export function runProductionMonteCarlo(baseParams, settings, iterations = 1000) {
    const duration = baseParams.projectDuration || 30;
    const yearDataBuckets = Array(duration).fill(0).map(() => []); // buckets for each year
    const reservesTrace = []; // Total recoverable volume for each iteration
    const vplTrace = []; // NPV for each iteration

    // 1. Run Iterations
    for (let i = 0; i < iterations; i++) {
        // Sample Parameters
        const peak = settings.peakProduction.active
            ? triangularSample(settings.peakProduction.min, settings.peakProduction.mode, settings.peakProduction.max)
            : baseParams.peakProduction || 100;

        const plateau = settings.plateauDuration.active
            ? triangularSample(settings.plateauDuration.min, settings.plateauDuration.mode, settings.plateauDuration.max)
            : baseParams.plateauDuration || 4;

        const decline = settings.declineRate.active
            ? triangularSample(settings.declineRate.min, settings.declineRate.mode, settings.declineRate.max)
            : baseParams.declineRate || 10;

        // RampUp is usually less critical to vary for "Reservoir Risk", but we take it from base
        // Could be added later.
        const rampUp = baseParams.rampUpDuration || 3;

        // BSW Parameters (Detailed Mode Only)
        // If not active or in simple mode, these will fallback to baseParams inside calculateScenarioCurve or handled here.
        const bswBreakthrough = settings.bswBreakthrough?.active
            ? triangularSample(settings.bswBreakthrough.min, settings.bswBreakthrough.mode, settings.bswBreakthrough.max)
            : baseParams.bswBreakthrough || 5;

        const bswGrowthRate = settings.bswGrowthRate?.active
            ? triangularSample(settings.bswGrowthRate.min, settings.bswGrowthRate.mode, settings.bswGrowthRate.max)
            : baseParams.bswGrowthRate || 1.2;

        const maxLiquids = baseParams.maxLiquids || 200000; // bpd (not kbpd) - Careful with units. baseParams usually has raw values.
        // Convert to kbpd for consistency with curve calculation if needed, but curve uses kbpd internally for volume? 
        // calculateScenarioCurve uses 'peak' which is in kbpd. maxLiquids in baseParams is likely in bpd (200000).
        // Let's pass it as is and handle conversion in the function.

        // Calculate Curve
        const curve = calculateScenarioCurve({
            peak, plateau, decline, rampUp,
            bswBreakthrough, bswGrowthRate, maxLiquids,
            productionMode: baseParams.productionMode
        }, duration);

        // Store Annual Data
        let totalVolume = 0;
        curve.forEach((vol, yearIdx) => {
            yearDataBuckets[yearIdx].push(vol);
            totalVolume += vol;
        });

        reservesTrace.push(totalVolume);

        // Calculate VPL
        // We need to pass the sampled values to generateProjectData
        const scenarioParams = {
            ...baseParams,
            peakProduction: peak,
            plateauDuration: plateau,
            declineRate: decline,
            bswBreakthrough: bswBreakthrough,
            bswGrowthRate: bswGrowthRate,
            bswMax: 95 // Ensure default is set if missing
        };

        // This effectively runs the full financial model for this scenario
        const projectData = generateProjectData(scenarioParams);
        vplTrace.push(projectData.metrics.vpl);
    }

    // 2. Calculate Percentiles for Curves and Reserves
    const calculatePercentiles = (arr) => {
        arr.sort((a, b) => a - b);
        const p10Index = Math.floor(arr.length * 0.1);
        const p50Index = Math.floor(arr.length * 0.5);
        const p90Index = Math.floor(arr.length * 0.9);
        return {
            p10: arr[p90Index], // P10 in Production usually means "10% chance to be HIGHER" (Optimistic) OR "10th percentile".
            // In Oil&Gas: 
            // P90 = Conservative (90% probability of being AT LEAST this value) -> Lower Value
            // P10 = Optimistic (10% probability of being AT LEAST this value) -> Higher Value
            // So sorting Ascending: Index 0.1 is Low Value (P90), Index 0.9 is High Value (P10)
            p50: arr[p50Index],
            p90: arr[p10Index]  // Swapped indices to match O&G standard naming (P90 is the lower curve)
        };
    };

    const p10Curve = [];
    const p50Curve = [];
    const p90Curve = [];

    yearDataBuckets.forEach(yearData => {
        const stats = calculatePercentiles(yearData);
        p10Curve.push(stats.p10); // High
        p50Curve.push(stats.p50); // Mid
        p90Curve.push(stats.p90); // Low
    });

    // Reserves Stats
    const reservesStats = calculatePercentiles(reservesTrace);

    // VPL Stats
    const vplStats = calculatePercentiles(vplTrace);

    const startYear = baseParams.capexDuration || 5;

    const endYear = baseParams.projectDuration || 30;

    // Format for Recharts and filter by project duration
    const chartData = p10Curve.map((val, idx) => ({
        year: idx + startYear,
        p10: val, // High Case
        p50: p50Curve[idx],
        p90: p90Curve[idx] // Low Case
    })).filter(d => d.year <= endYear);

    return {
        chartData,
        reserves: {
            p10: reservesStats.p10,
            p50: reservesStats.p50,
            p90: reservesStats.p90
        },
        vpl: {
            p10: vplStats.p10,
            p50: vplStats.p50,
            p90: vplStats.p90
        }
    };
}
