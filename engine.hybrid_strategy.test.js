const Engine = require('./engine');

describe('HybridStrategy', () => {
    test('should be defined', () => {
        expect(Engine.HybridStrategy).toBeDefined();
    });

    test('should simulate Home + BTL logic', () => {
        const input = {
            personal: {
                taxBand: 'basic',
                liquidAssets: 200000,
                isaBalance: 0,
                monthlySavings: 1000,
                rent: { current: 0, inflation: 0 },
                stockGrowth: 0,
                propertyGrowth: 0,
                isFTB: false
            },
            home: { 
                active: true,
                price: 200000,
                depositPct: 10,
                rate: 5.0,
                term: 25,
                repairRate: 0, serviceCharge: 0, buyingCost: 0, sellingCostPct: 0, renoCost: 0,
                lodger: { active: false }
            },
            btl: { 
                active: true,
                price: 150000,
                depositPct: 25,
                rateCompany: 5.0,
                term: 25,
                repairRate: 0, serviceCharge: 0, buyingCost: 0, sellingCostPct: 0,
                rentYield: 5.0,
                wrappers: { company: true },
                mortgageType: 'interestOnly'
            },
            settings: {}
        };
        const rates = Engine.getTaxRates('basic');

        const strategy = new Engine.HybridStrategy('Home+BTL', input);
        
        // Initial checks
        // Home Debt: 180k. BTL Debt: 112.5k (75% of 150k).
        expect(strategy.debtHome).toBe(180000);
        expect(strategy.debtBTL).toBe(112500);
        
        // Simulate 1 month
        strategy.simulateMonth(0, input, rates);
        
        // Check BTL Profit (Income - Interest)
        // BTL Income: 150k * 5% / 12 = 625.
        // BTL Interest: 112.5k * 5% / 12 = 468.75.
        // Profit: 156.25.
        // Tax: 156.25 * 0.19 = 29.6875.
        // Net: 126.5625.
        
        expect(strategy.coCash).toBeCloseTo(126.56, 1);
        
        // Check Breakdown
        strategy.calculateExit(1, input, rates);
        
        // Interest = Home Interest + BTL Interest
        // Home Interest (Repayment): 180k * 5%/12 = 750.
        // BTL Interest: 468.75.
        // Total: 1218.75.
        expect(strategy.breakdown.interest[0]).toBeCloseTo(1218.75, 1);
    });
});
