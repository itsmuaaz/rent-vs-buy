const Engine = require('./engine');

describe('Financial Engine Sanity Check', () => {
    test('Calculates Mortgage Correctly', () => {
        const p = Engine.calculateMortgage(200000, 4.5, 25);
        expect(p).toBeCloseTo(1111.66, 1);
    });

    test('Calculates Stamp Duty Correctly', () => {
        expect(Engine.calculateStampDuty(400000, 'personal', false)).toBe(7500);
        expect(Engine.calculateStampDuty(400000, 'personal', true)).toBe(0);
        expect(Engine.calculateStampDuty(400000, 'company', false)).toBe(27500);
    });
});

describe('Simulation Verification (Valuation Modes)', () => {
    // 1. Default Scenario (Rent Only possible)
    test('Rent Liquid Value Matches Historical Snapshot', () => {
        const defaults = {
            liquid: 50000, isa: 20000, monthlySavings: 1000,
            stockGrowth: 8/100, rent: 1500, rentInf: 3/100,
            price: 400000, reno: 60000, postValue: 525000,
            depositPct: 25/100, term: 30,
            rateP: 4.5, rateC: 5.5, isFTB: true,
            lodgerInc: 900, lodgerYears: 2, taxBand: 'additional',
            isStockCrash: false, isPropCrash: false
        };
        const data = Engine.simulateStrategies(defaults);
        
        // Matches previous "Net Worth" (which was liquid stocks)
        expect(data.stratA.netWorthLiquid[9]).toBeCloseTo(253451.45, 1);
        
        // Gross > Liquid (due to GIA tax)
        expect(data.stratA.netWorth[9]).toBeGreaterThan(data.stratA.netWorthLiquid[9]);
        
        // Check B is impossible
        expect(data.possibleB).toBe(false);
    });

    // 2. London Pro Scenario (Buy is possible)
    test('Buy Strategy Liquid Value is Less Than Gross', () => {
        const london = {
            liquid: 130000, isa: 30000, monthlySavings: 1500,
            stockGrowth: 7/100, rent: 2400, rentInf: 3/100,
            price: 500000, reno: 10000, postValue: 510000,
            depositPct: 20/100, term: 30, 
            rateP: 4.5, rateC: 5.5, 
            isFTB: true,
            lodgerInc: 0, lodgerYears: 0, taxBand: 'higher',
            isStockCrash: false, isPropCrash: false
        };
        
        const data = Engine.simulateStrategies(london);
        
        const gross = data.stratB.netWorth[9];
        const liquid = data.stratB.netWorthLiquid[9];
        
        // Check Logic
        expect(liquid).toBeLessThan(gross);
        expect(gross - liquid).toBeGreaterThan(5000); // At least £5k selling fees
        
        // Previously B NetWorth was ~636k (Gross Property + Liquid Stocks).
        // New B Gross should be >= 636k.
        expect(gross).toBeGreaterThanOrEqual(636400);
    });
});