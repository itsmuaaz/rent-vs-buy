const Engine = require('./engine');

// Helper to build default state (Top-level for all tests)
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
    if (overrides.settings) Object.assign(s.settings, overrides.settings);
    return s;
};

describe('Financial Engine Sanity Check', () => {
    test('Calculates Mortgage Correctly', () => {
        const p = Engine.calculateMortgage(200000, 4.5, 25);
        expect(p).toBeCloseTo(1111.66, 1);
    });

    test('Calculates Stamp Duty Correctly', () => {
        // Standard (Mover) £400k: 0 on 125k, 2% on 125k (2500), 5% on 150k (7500) = 10,000
        expect(Engine.calculateStampDuty(400000, 'personal', false)).toBe(10000);
        // FTB £400k (Relief applies): 0 on 300k, 5% on 100k = 5,000
        expect(Engine.calculateStampDuty(400000, 'personal', true)).toBe(5000);
        // FTB £550k (Relief Lost > 500k): Standard Rules = 17,500
        expect(Engine.calculateStampDuty(550000, 'personal', true)).toBe(17500);
        // Company £400k (+5% Surcharge): 10,000 (Base) + 5% of 400k (20,000) = 30,000
        expect(Engine.calculateStampDuty(400000, 'company', false)).toBe(30000);
    });
});

describe('Simulation Verification (New Asset Model)', () => {
    
    test('Property Growth Input: Higher growth increases Buy wealth', () => {
        // Case A: 1% Growth
        const V1 = buildState({ personal: { propertyGrowth: 1.0, liquidAssets: 100000 }, home: { active: true, price: 300000, renoCost: 0, lodger:{active:false} } });
        const res1 = Engine.simulateStrategies(V1).stratB.netWorth[9];

        // Case B: 5% Growth
        const V2 = buildState({ personal: { propertyGrowth: 5.0, liquidAssets: 100000 }, home: { active: true, price: 300000, renoCost: 0, lodger:{active:false} } });
        const res2 = Engine.simulateStrategies(V2).stratB.netWorth[9];

        expect(res2).toBeGreaterThan(res1);
        // Approx check: 300k * 1.05^10 vs 300k * 1.01^10
        // diff is large.
        expect(res2 - res1).toBeGreaterThan(100000);
    });

    test('Rent Strategy: Matches Historical Baseline', () => {
        const input = buildState();
        const data = Engine.simulateStrategies(input);
        
        // Previous baseline was ~253k (20% CGT). Now ~252k (24% CGT).
        expect(data.stratA.netWorthLiquid[9]).toBeCloseTo(251987.88, 1);
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

    test('Lodger Tax: Rent-a-Room Relief applies correctly', () => {
        // Scenario 1: Tax Free (Income <= 7500/yr)
        const V1 = buildState({
            personal: { liquidAssets: 100000, taxBand: 'higher' },
            home: { active: true, price: 300000, renoCost: 0, lodger: { active: true, income: 600, years: 10 } }
        });
        // 600 * 12 = 7200 < 7500. Tax should be 0.
        // StratC DeadMoney should include reduced rent but no extra tax penalty
        // We can check implicitly by comparing with taxBand 'basic' -> should be identical
        
        const V2 = buildState({
            personal: { liquidAssets: 100000, taxBand: 'basic' },
            home: { active: true, price: 300000, renoCost: 0, lodger: { active: true, income: 600, years: 10 } }
        });
        
        const nw1 = Engine.simulateStrategies(V1).stratC.netWorth[9];
        const nw2 = Engine.simulateStrategies(V2).stratC.netWorth[9];
        expect(nw1).toBeCloseTo(nw2, 1); // Should be equal

        // Scenario 2: Taxed (Income = 1000/yr -> 12000/yr)
        // Taxable: 12000 - 7500 = 4500.
        // Higher Rate (40%) tax = 1800/yr.
        // Basic Rate (20%) tax = 900/yr.
        // Basic Rate person should be wealthier by ~900 * 10 (compounded)
        
        const V3 = buildState({
            personal: { liquidAssets: 100000, taxBand: 'higher' },
            home: { active: true, price: 300000, renoCost: 0, lodger: { active: true, income: 1000, years: 10 } }
        });
        const V4 = buildState({
            personal: { liquidAssets: 100000, taxBand: 'basic' },
            home: { active: true, price: 300000, renoCost: 0, lodger: { active: true, income: 1000, years: 10 } }
        });
        
        const nw3 = Engine.simulateStrategies(V3).stratC.netWorth[9];
        const nw4 = Engine.simulateStrategies(V4).stratC.netWorth[9];
        
        expect(nw4).toBeGreaterThan(nw3);
        expect(nw4 - nw3).toBeGreaterThan(9000); // At least the tax diff
    });

    test('Section 24 (Personal BTL): Higher Rate taxpayers pay more', () => {
        // Setup BTL Personal
        const V_Basic = buildState({
            personal: { liquidAssets: 100000, taxBand: 'basic' }, // 20%
            btl: { active: true, price: 200000, depositPct: 25, wrappers: { personal: true } }
        });
        const V_Higher = buildState({
            personal: { liquidAssets: 100000, taxBand: 'higher' }, // 40%
            btl: { active: true, price: 200000, depositPct: 25, wrappers: { personal: true } }
        });
        
        const nwBasic = Engine.simulateStrategies(V_Basic).stratE.netWorth[9];
        const nwHigher = Engine.simulateStrategies(V_Higher).stratE.netWorth[9];
        
        // Basic rate payer effectively pays 0 extra tax if loan interest covers profit?
        // With S24, Basic payer gets 20% relief on interest, and pays 20% on profit.
        // Higher payer pays 40% on profit, but only 20% relief. 
        // So Higher payer suffers.
        
        expect(nwBasic).toBeGreaterThan(nwHigher);
    });

    test('ISA Limit: Excess savings spill to GIA', () => {
        const V = buildState({
            personal: { monthlySavings: 4000, isaBalance: 0, liquidAssets: 0 } // Start fresh
        });
        
        // Year 1: Save 4000 * 12 = 48000.
        // ISA Cap = 20000.
        // GIA = 28000.
        // Growth applied.
        
        const res = Engine.simulateStrategies(V);
        // Access internal state? No, result doesn't expose ISA/GIA split directly in `stratA` object 
        // except via `liquidHistory`.
        // But `liquidHistory` sums them.
        // Wait, `invest` function logic is internal.
        // However, we can deduce it from tax? 
        // GIA growth is taxed. ISA is not.
        // But tax is only applied on exit in this model?
        // `stratA` has `netWorth` (Gross) and `netWorthLiquid` (After CGT).
        
        // If we put 48k in ISA (impossible), liquid = gross.
        // If we put 28k in GIA, liquid < gross (if growth > 0).
        
        // Let's check liquid vs gross.
        const gross = res.stratA.netWorth[0];
        const liquid = res.stratA.netWorthLiquid[0];
        
        // With 8% growth, there is gain.
        // GIA gain is taxed at 20% (Higher rate CGT).
        // ISA gain is 0 tax.
        
        expect(liquid).toBeLessThan(gross); // Proves GIA was used and taxed
    });

    test('Market Crash Simulator: Year 1 drop', () => {
        const V = buildState({
            personal: { propertyGrowth: 3.0, liquidAssets: 100000 },
            home: { active: true, price: 300000, renoCost: 0 },
            settings: { propCrash: true }
        });
        
        const res = Engine.simulateStrategies(V);
        
        // Year 1 House Value
        // Start: 300k
        // Normal Year 1: 300k * 1.03 = 309k
        // Crash Year 1: 309k * 0.85 = 262.65k
        // `houseB` is private in engine, but `netWorth` reflects it.
        // Net Worth = House - Debt + Cash.
        // Debt start = 225k. Debt Year 1 slightly less.
        
        // Let's compare with Normal run
        const V_Normal = buildState({
            personal: { propertyGrowth: 3.0, liquidAssets: 100000 },
            home: { active: true, price: 300000, renoCost: 0 },
            settings: { propCrash: false }
        });
        const resNormal = Engine.simulateStrategies(V_Normal).stratB.netWorth[0];
        const resCrash = res.stratB.netWorth[0];
        
        expect(resCrash).toBeLessThan(resNormal);
        expect(resNormal - resCrash).toBeGreaterThan(40000); // ~46k diff expected
    });

    test('Selling Fee Impact: Higher fee reduces liquid wealth', () => {
        // Case A: 0% Fee
        const V1 = buildState({ 
            personal: { liquidAssets: 100000 },
            home: { active: true, price: 300000, renoCost: 0, sellingCostPct: 0 } 
        });
        const res1 = Engine.simulateStrategies(V1).stratB.netWorthLiquid[9];

        // Case B: 2% Fee
        const V2 = buildState({ 
            personal: { liquidAssets: 100000 },
            home: { active: true, price: 300000, renoCost: 0, sellingCostPct: 2.0 } 
        });
        const res2 = Engine.simulateStrategies(V2).stratB.netWorthLiquid[9];

        // Result 1 should be > Result 2
        // House Value at Y10 ~ 403k
        // 2% of 403k = 8k.
        expect(res1).toBeGreaterThan(res2);
        expect(res1 - res2).toBeGreaterThan(7000); 
    });
});

describe('Sensitivity Matrix Verification', () => {
    test('Matrix returns 5x5 grid with correct labels', () => {
        const V = buildState({
            personal: { liquidAssets: 100000, propertyGrowth: 3.0 },
            home: { active: true, price: 300000, rate: 4.5, renoCost: 0 }
        });
        
        const matrix = Engine.calculateSensitivityMatrix(V);
        
        expect(matrix.rows.length).toBe(5);
        expect(matrix.rows[0].length).toBe(5);
        expect(matrix.xLabels).toContain('3.0%');
        expect(matrix.yLabels).toContain('4.5%');
    });

    test('High growth favors Buy, High rate favors Rent', () => {
        const V = buildState({
            personal: { liquidAssets: 100000, propertyGrowth: 3.0 },
            home: { active: true, price: 300000, rate: 4.5, renoCost: 0 }
        });
        
        const matrix = Engine.calculateSensitivityMatrix(V);
        
        const bestForRent = matrix.rows[0][0]; // Highest Rate (6.5%), Lowest Growth (1.0%)
        const bestForBuy = matrix.rows[4][4];  // Lowest Rate (2.5%), Highest Growth (5.0%)
        
        expect(bestForRent.winner).toBe('Rent');
        expect(bestForBuy.winner).toBe('Buy');
    });
});

describe('Inflation Adjustment (Real Terms)', () => {
    test('Adjusts future values correctly', () => {
        const nominal = {
            stratA: { netWorth: [10300, 10609], netWorthLiquid: [10300, 10609] },
            stratB: { netWorth: [20600, 21218], netWorthLiquid: [20600, 21218] }
        };
        const inflationRate = 3.0;
        
        const real = Engine.adjustForInflation(nominal, inflationRate);
        
        // Year 1: 10300 / 1.03 = 10000
        expect(real.stratA.netWorth[0]).toBeCloseTo(10000, 0);
        
        // Year 2: 10609 / (1.03^2) = 10609 / 1.0609 = 10000
        expect(real.stratA.netWorth[1]).toBeCloseTo(10000, 0);
        
        // Ensure StratB also adjusted
        expect(real.stratB.netWorth[0]).toBeCloseTo(20000, 0);
    });
});

describe('Mortgage Overpayments', () => {
    test('Overpaying reduces total interest', () => {
        const base = {
            personal: { liquidAssets: 100000, monthlySavings: 2000, rent: {current:1000, inflation:3}, propertyGrowth:3, stockGrowth:7, isaBalance:0 },
            home: { active: true, price: 300000, depositPct: 10, rate: 5.0, term: 25, overpayment: 0, renoCost: 0, lodger:{active:false} }
        };
        
        // Scenario A: No Overpayment
        const VA = buildState(base);
        const resA = Engine.simulateStrategies(VA).stratB;
        
        // Scenario B: £500/mo Overpayment
        const VB = buildState(base);
        VB.home.overpayment = 500;
        const resB = Engine.simulateStrategies(VB).stratB;
        
        // Interest paid in first 10 years
        // Array sums
        const sumInt = (arr) => arr.slice(0, 10).reduce((a, b) => a + b, 0);
        const intA = sumInt(resA.breakdown.interest);
        const intB = sumInt(resB.breakdown.interest);
        
        expect(intB).toBeLessThan(intA);
        // Approx check: 500/mo * 12 * 10 = 60k extra paid.
        // Principal reduces faster, so interest drops.
    });

    test('BTL Overpayment reduces total interest (Strat D)', () => {
        const base = {
            personal: { liquidAssets: 100000, monthlySavings: 2000, rent: {current:1000, inflation:3}, propertyGrowth:3, stockGrowth:7, isaBalance:0 },
            btl: { active: true, price: 200000, depositPct: 25, term: 25, overpayment: 0, wrappers: { company: true } }
        };
        
        // Scenario A: No Overpayment
        const VA = buildState(base);
        const resA = Engine.simulateStrategies(VA).stratD;
        
        // Scenario B: £500/mo Overpayment
        const VB = buildState(base);
        VB.btl.overpayment = 500;
        const resB = Engine.simulateStrategies(VB).stratD;
        
        const sumInt = (arr) => arr.slice(0, 10).reduce((a, b) => a + b, 0);
        const intA = sumInt(resA.breakdown.interest);
        const intB = sumInt(resB.breakdown.interest);
        
        expect(intB).toBeLessThan(intA);
    });
});
