const Engine = require('./engine');

describe('RentStrategy', () => {
    test('should be defined', () => {
        expect(Engine.RentStrategy).toBeDefined();
    });

    test('should simulate simple rent case correctly', () => {
        // Setup mock input
        const input = {
            personal: {
                taxBand: 'basic',
                liquidAssets: 10000,
                isaBalance: 5000,
                monthlySavings: 500,
                rent: { current: 1000, inflation: 0 },
                stockGrowth: 0, // Simplify for first test
                propertyGrowth: 0
            },
            home: { active: false },
            btl: { active: false },
            settings: {}
        };
        const rates = Engine.getTaxRates(input.personal.taxBand);

        const strategy = new Engine.RentStrategy('Rent', input.personal);
        
        // Simulate 1 month
        // Month 0 (January)
        strategy.simulateMonth(0, input, rates);
        
        // Call calculateExit to flush results to arrays
        strategy.calculateExit(1, input, rates);
        
        // Expected:
        // Rent = 1000. Total Budget = 1000 (Rent) + 500 (Savings) = 1500.
        // Paid Rent: 1000. Surplus: 500.
        // Invest 500. ISA limit 20000/12 = 1666. All 500 goes to ISA.
        // Initial ISA: 5000 -> 5500.
        // Initial GIA: 5000 -> 5000.
        
        expect(strategy.breakdown.rent[0]).toBe(1000);
        expect(strategy.breakdown.interest[0]).toBe(0); // No debt
        
        // Verify state (need to expose state or check internal properties if public)
        // Since I made properties public in Strategy base class, I can check them if I access them.
        // But simulateMonth updates internal state variables (isaA, giaA in procedural code).
        // The Class should store these in `this`.
        
        expect(strategy.isa).toBe(5500);
        expect(strategy.gia).toBe(5000);
    });
});
