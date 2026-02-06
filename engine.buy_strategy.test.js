const Engine = require('./engine');

describe('BuyStrategy', () => {
    test('should be defined', () => {
        expect(Engine.BuyStrategy).toBeDefined();
    });

    test('should simulate buy home logic correctly', () => {
        // Setup mock input
        const input = {
            personal: {
                taxBand: 'basic',
                liquidAssets: 50000,
                isaBalance: 0,
                monthlySavings: 1000,
                rent: { current: 0, inflation: 0 },
                stockGrowth: 0,
                propertyGrowth: 0,
                isFTB: true
            },
            home: { 
                active: true,
                price: 200000,
                depositPct: 10, // 20k deposit. Loan 180k.
                rate: 5.0, // 5% interest
                term: 25,
                repairRate: 0, // Simplify
                serviceCharge: 0,
                buyingCost: 0,
                sellingCostPct: 0,
                renoCost: 0,
                lodger: { active: false }
            },
            btl: { active: false },
            settings: {}
        };
        const rates = Engine.getTaxRates(input.personal.taxBand);

        const strategy = new Engine.BuyStrategy('Buy', input);
        
        // Check initial state
        // Debt: 180,000. House: 200,000.
        // Cash spent: 20,000 (Deposit). 
        // Liquid Assets Remaining: 30,000.
        
        expect(strategy.debt).toBe(180000);
        expect(strategy.houseValue).toBe(200000);
        expect(strategy.gia).toBe(30000);

        // Simulate 1 month
        // Mortgage Payment: 
        // Rate 5%. Monthly = 5/1200 = 0.0041666...
        // N = 25*12 = 300.
        // Payment = (180000 * r * (1+r)^300) / ((1+r)^300 - 1)
        // P ≈ 1052.26
        // Interest Month 1 = 180000 * 0.0041666... = 750.
        // Principal = 1052.26 - 750 = 302.26.
        
        strategy.simulateMonth(0, input, rates);
        
        // Check Debt Reduction
        expect(strategy.debt).toBeLessThan(180000);
        expect(strategy.debt).toBeCloseTo(180000 - 302.26, 0); // Approx
        
        // Check Interest Recording
        // We need to call calculateExit to populate arrays if we check breakdown
        // But we can check cumulative state if exposed.
        // Let's call calculateExit to flush.
        strategy.calculateExit(1, input, rates);
        
        expect(strategy.breakdown.interest[0]).toBeCloseTo(750, 0);
    });
});
