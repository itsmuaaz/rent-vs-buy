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

describe('Simulation Verification (New Asset Model)', () => {
    
    // Helper to build default state
    const buildState = (overrides = {}) => {
        const s = {
            personal: {
                liquidAssets: 50000, isaBalance: 20000, monthlySavings: 1000,
                stockGrowth: 8, taxBand: 'additional',
                rent: { current: 1500, inflation: 3 },
                isFTB: true
            },
            home: {
                active: true, price: 400000, depositPct: 25, term: 30, rate: 4.5,
                repairRate: 1.0, serviceCharge: 0, buyingCost: 2000, sellingCostPct: 1.5,
                renoCost: 60000, postWorkValue: 525000,
                lodger: { active: true, income: 900, years: 2 }
            },
            btl: {
                active: false, price: 200000, depositPct: 25, term: 30,
                ratePersonal: 4.5, rateCompany: 5.5,
                repairRate: 0.5, serviceCharge: 2000, rentYield: 5.0,
                wrappers: { personal: true, company: true }
            },
            settings: { valuationMode: 'liquid', stockCrash: false, propCrash: false }
        };
        // Deep merge overrides (simplified for test)
        if (overrides.personal) Object.assign(s.personal, overrides.personal);
        if (overrides.home) Object.assign(s.home, overrides.home);
        if (overrides.btl) Object.assign(s.btl, overrides.btl);
        return s;
    };

    test('Rent Strategy: Matches Historical Baseline', () => {
        const V = buildState();
        const data = Engine.simulateStrategies(V);
        
        // Previous baseline was ~253k for Rent at Year 10
        expect(data.stratA.netWorthLiquid[9]).toBeCloseTo(253451.45, 1);
    });

    test('Buy Strategy: Liquid < Gross due to Fees', () => {
        const V = buildState({
            personal: { liquidAssets: 130000, isaBalance: 30000, monthlySavings: 1500, rent: { current: 2400, inflation: 3 }, taxBand: 'higher' },
            home: { active: true, price: 500000, depositPct: 20, term: 30, rate: 4.5, repairRate: 1.0, buyingCost: 2000, renoCost: 10000, postWorkValue: 510000, lodger: { active: false } }
        });
        
        const data = Engine.simulateStrategies(V);
        
        const gross = data.stratB.netWorth[9];
        const liquid = data.stratB.netWorthLiquid[9];
        
        expect(liquid).toBeLessThan(gross);
        expect(gross).toBeGreaterThan(600000);
    });

    test('Service Charge Impact: Wealth should be lower with SC', () => {
        // Scenario 1: No SC
        const V1 = buildState({ 
            personal: { liquidAssets: 100000 },
            home: { active: true, price: 300000, serviceCharge: 0, renoCost: 0 } 
        });
        const res1 = Engine.simulateStrategies(V1).stratB.netWorthLiquid[9];

        // Scenario 2: High SC (£3000/yr)
        const V2 = buildState({ 
            personal: { liquidAssets: 100000 },
            home: { active: true, price: 300000, serviceCharge: 3000, renoCost: 0 } 
        });
        const res2 = Engine.simulateStrategies(V2).stratB.netWorthLiquid[9];

        // Wealth should be significantly lower
        // Approx £3000 * 10 years + lost compounding ~ £40k+?
        expect(res2).toBeLessThan(res1);
        expect(res1 - res2).toBeGreaterThan(30000); 
    });

    test('Strategy F (Home + BTL): Correctly sums costs', () => {
        // We need enough cash for both
        const V = buildState({
            personal: { liquidAssets: 200000 },
            home: { active: true, price: 300000, depositPct: 10, buyingCost: 1000, renoCost: 0, serviceCharge: 0, lodger:{active:false} },
            btl: { active: true, price: 150000, depositPct: 25, buyingCost: 1000, serviceCharge: 2000, wrappers: { company: true } }
        });

        const data = Engine.simulateStrategies(V);
        
        expect(data.possibleF).toBe(true);
        
        // Check Breakdown for Year 1
        // Maint F should be: (Home Maint) + (BTL Maint) + (BTL SC)
        // Home Maint: 300k * 1% = 3000
        // BTL Maint: 150k * 0.5% = 750 + 2000 SC = 2750
        // Total: 5750
        
        const maintYear1 = data.stratF.breakdown.maintenance[0];
        expect(maintYear1).toBeCloseTo(5750, 0);
    });
});