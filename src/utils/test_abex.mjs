console.log('--- Debugging Abex Verification ---');

const runTest = async () => {
    try {
        console.log('Importing calculations.js...');
        const module = await import('./calculations.js');
        const { generateProjectData } = module;
        console.log('Import successful. generateProjectData is:', typeof generateProjectData);

        const params = {
            // Basic setup
            projectDuration: 20,
            startYear: 2025,
            peakProduction: 150,

            // Capex
            totalCapex: 1000000000,
            capexDuration: 5,
            capexConcentration: 'mid',
            capexPeakRelative: 3,

            // Depreciation (Simplify for test)
            depreciationMode: 'simple',
            depreciationYears: 10,

            // Abex Detailed Params
            abexMode: 'detailed',
            abexPerWell: 25000000,
            abexSubseaPct: 25,
            abexPlatform: 150000000,

            // Wells Params
            wellsParams: {
                numWells: 10
            },

            // Splits 
            capexSplit: {
                platform: 40,
                subsea: 40,
                wells: 20
            }
        };

        console.log('Running generateProjectData...');
        const result = generateProjectData(params);

        if (!result || !result.yearlyData) {
            console.error('Result or yearlyData is missing');
            return;
        }

        const yearlyData = result.yearlyData;
        const decomYearIndex = yearlyData.length - 1;
        const decomYearData = yearlyData[decomYearIndex];

        console.log(`Decom Year: ${decomYearData.year}`);
        console.log(`Capex in Decom Year: ${decomYearData.capex / 1000000} MM`);

        const expected = 500000000;
        const actual = decomYearData.capex;

        console.log(`Expected Abex: ${expected / 1000000} MM`);

        if (Math.abs(actual - expected) < 1000) {
            console.log('✅ VERIFICATION PASSED: Abex matches expected value.');
        } else {
            console.error('❌ VERIFICATION FAILED: Abex mismatch.');
            console.error(`Diff: ${actual - expected}`);
        }

    } catch (error) {
        console.error('❌ Error in test script:', error);
    }
};

runTest();
