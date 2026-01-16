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

describe('Simulation Verification (Golden Snapshots)', () => {
    // 1. Default Scenario (Rent Only possible)
    test('Default Scenario Matches Snapshot', () => {
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
        
        expect(data.stratA.netWorth[9]).toBeCloseTo(253451.45, 1);
        expect(data.possibleB).toBe(false);
    });

    // 2. London Pro Scenario (Buy is possible)
    test('London Pro Scenario Matches Snapshot', () => {
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
        
        expect(data.stratA.netWorth[9]).toBeCloseTo(449087.93, 1);
        expect(data.stratB.netWorth[9]).toBeCloseTo(636405.08, 1);
        expect(data.possibleB).toBe(true);
    });
});