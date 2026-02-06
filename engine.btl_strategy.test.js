const Engine = require('./engine');

describe('BTLStrategy', () => {
    test('should be defined', () => {
        expect(Engine.BTLStrategy).toBeDefined();
    });

    test('should simulate BTL Company logic', () => {
        const input = {
            personal: {
                taxBand: 'higher', // 40% income, 19% corp (via Engine.getTaxRates assumption)
                liquidAssets: 100000,
                isaBalance: 0,
                monthlySavings: 0,
                rent: { current: 0, inflation: 0 },
                stockGrowth: 0,
                propertyGrowth: 0,
                isFTB: false
            },
            home: { active: false },
            btl: { 
                active: true,
                price: 200000,
                depositPct: 25, // 50k deposit. Loan 150k.
                rentYield: 5.0, // 10k/year = 833.33/month
                repairRate: 0,
                serviceCharge: 0,
                buyingCost: 0,
                sellingCostPct: 0,
                term: 25,
                rateCompany: 5.0, // 5%. Interest = 150k * 5% = 7500/yr = 625/mo
                ratePersonal: 4.0,
                wrappers: { company: true, personal: false },
                mortgageType: 'interestOnly'
            },
            settings: {}
        };
        const rates = Engine.getTaxRates('higher'); // corp: 0.19

        const strategy = new Engine.BTLStrategy('BTL Co', input, 'company');
        
        // Initial State
        // Cash: 100k - 50k (deposit) - stamp (200k BTL stamp = ?)
        // Stamp on 200k (Additional/Company rate +3% or +5%?)
        // Rules: 0-125k 3%, 125-250 5%? (Depends on engine implementation).
        // Let's check engine logic later or accept whatever it is.
        // Assuming Engine.getAcquisitionCost works.
        
        // Simulate 1 Month
        // Rent Income: 833.33
        // Mortgage Interest: 625.00
        // Profit: 208.33
        // Corp Tax: 208.33 * 0.19 = 39.58
        // Net Profit: 168.75
        // Cash accumulation (coCash) should increase by Net Profit.
        
        strategy.simulateMonth(0, input, rates);
        
        // Verify Profit/Tax recording
        // We need to inspect internal state or call calculateExit
        
        // Check breakdown if accessible
        // strategy.cumulativeTax?
        
        // Let's assume we can access cumulative properties for testing or use calculateExit
        strategy.calculateExit(1, input, rates);
        
        // breakdown.rent tracks Personal Rent Paid (which is 0 in this input)
        expect(strategy.breakdown.rent[0]).toBe(0);
        
        expect(strategy.breakdown.interest[0]).toBeCloseTo(625.00, 1);
        expect(strategy.breakdown.tax[0]).toBeCloseTo(39.58, 1);
    });
});
