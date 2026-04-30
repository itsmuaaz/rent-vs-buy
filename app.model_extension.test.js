
// Mock dependencies
global.Engine = require('./engine');
global.window = {
    location: { search: '' },
    AuditLogic: [],
    addEventListener: jest.fn()
};
global.document = {
    addEventListener: jest.fn()
};
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn()
};
global.Alpine = {
    data: jest.fn(),
    directive: jest.fn()
};

const { calculatorLogic } = require('./app');

describe('App Data Model Extensions', () => {
    let app;

    beforeEach(() => {
        app = calculatorLogic();
        app.$nextTick = (cb) => cb(); // Mock $nextTick for tests to run synchronously
    });

    test('lockedBudget exists and defaults to true', () => {
        expect(app.lockedBudget).toBeDefined();
        expect(app.lockedBudget).toBe(true);
    });

    test('totalBudget is computed correctly', () => {
        // Set specific values
        app.i.personal.rent.current = 1000;
        app.i.personal.monthlySavings = 500;
        
        expect(app.totalBudget).toBe(1500);
    });

    test('homeDepositAmount exists and matches calculation', () => {
        // Price: 300,000, DepositPct: 15%
        // Expected: 45,000
        app.i.home.price = 300000;
        app.i.home.depositPct = 15;
        
        expect(app.homeDepositAmount).toBe(45000);
    });

    test('btlRentAmount exists and matches calculation', () => {
        // Price: 200,000, Yield: 5%
        // Rent = (200000 * 0.05) / 12 = 833.33...
        app.i.btl.price = 200000;
        app.i.btl.rentYield = 5.0;
        
        expect(Math.round(app.btlRentAmount)).toBe(833);
    });

    test('homeDepositAmount setter updates depositPct', () => {
        app.i.home.price = 300000;
        // Set Deposit £ to 30,000 (10%)
        app.homeDepositAmount = 30000;
        expect(app.i.home.depositPct).toBe(10);
    });

    test('btlRentAmount setter updates rentYield', () => {
        app.i.btl.price = 200000;
        // Set Rent £ to 1000/mo -> 12k/yr -> 6% Yield
        // 12000 / 200000 = 0.06 = 6%
        app.btlRentAmount = 1000;
        expect(app.i.btl.rentYield).toBe(6.0);
    });

    test('Precision Round Trip', () => {
        app.i.home.price = 300000;
        // User types 31,000
        app.homeDepositAmount = 31000;
        
        // Pct should be 10.333...
        expect(app.i.home.depositPct).toBeCloseTo(10.333333, 4);
        
        // Getter should return 31,000 (or very close)
        expect(app.homeDepositAmount).toBeCloseTo(31000, 5);
    });

    describe('Budget Lock Logic', () => {
        let watchers = {};
        
        beforeEach(() => {
            watchers = {};
            app.$watch = jest.fn((prop, callback) => {
                watchers[prop] = callback;
            });
            app.updateCharts = jest.fn(); // Mock to prevent Chart errors
            app.calculateMatrixDebounced = jest.fn();
            
            // Set specific values before init so lockedTotal is correct
            app.i.personal.rent.current = 1000;
            app.i.personal.monthlySavings = 500;
            
            // Trigger init to register watchers
            app.init();
        });

        test('Changing Rent updates Savings when Locked', () => {
            // Setup
            app.lockedBudget = true;
            // Total Budget = 1500 (from beforeEach)
            
            // Simulate Rent Change: 1000 -> 1200
            // Expected Savings: 1500 - 1200 = 300
            
            const rentWatcher = watchers['i.personal.rent.current'];
            expect(rentWatcher).toBeDefined();

            rentWatcher(1200, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(300);
        });

        test('Changing Savings updates Rent when Locked', () => {
            app.lockedBudget = true;
            
            const savingsWatcher = watchers['i.personal.monthlySavings'];
            expect(savingsWatcher).toBeDefined();

            // Change Savings: 500 -> 800
            // Expected Rent: 1500 - 800 = 700
            savingsWatcher(800, 500);
            
            expect(app.i.personal.rent.current).toBe(700);
        });

        test('Unlocked changes are independent', () => {
            app.lockedBudget = false;
            
            const rentWatcher = watchers['i.personal.rent.current'];
            rentWatcher(1200, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(500); // Should not change
        });
        
        test('Savings cannot go below zero', () => {
            app.lockedBudget = true;
            
            const rentWatcher = watchers['i.personal.rent.current'];
            // Increase Rent to 2000 (Over budget)
            rentWatcher(2000, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(0);
            // Rent should stay 2000 (Total budget expands)
        });
    });

    describe('Smart Estimates (Buying Costs)', () => {
        let watchers = {};
        
        beforeEach(() => {
            watchers = {};
            app.$watch = jest.fn((prop, callback) => {
                watchers[prop] = callback;
            });
            app.updateCharts = jest.fn();
            app.calculateMatrixDebounced = jest.fn();
            app.init();
        });

        test('Default dirty state is false', () => {
            expect(app.i.home.buyingCostDirty).toBe(false);
        });

        test('Price change updates BuyingCost when NOT dirty', () => {
            app.i.home.price = 200000;
            app.i.home.buyingCostDirty = false;
            
            const priceWatcher = watchers['i.home.price'];
            // Trigger with new price 300,000
            // 1.5% of 300,000 = 4,500
            app.i.home.price = 300000;
            priceWatcher(300000, 200000);

            expect(app.i.home.buyingCost).toBe(4500);
        });

        test('Price change does NOT update BuyingCost when dirty', () => {
            app.i.home.price = 200000;
            app.i.home.buyingCost = 100; // Custom
            app.i.home.buyingCostDirty = true;
            
            const priceWatcher = watchers['i.home.price'];
            app.i.home.price = 300000;
            priceWatcher(300000, 200000);
            
            expect(app.i.home.buyingCost).toBe(100); // Should stay custom
        });
    });
});
