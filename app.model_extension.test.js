
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

    test('syncInputs performs update and respects isSyncing flag', () => {
        // Setup
        app.isSyncing = false;
        let targetVal = 0;
        const updateFn = (val) => { targetVal = val * 2; };
        
        // Execute
        app.syncInputs(10, updateFn);
        
        // Assert
        expect(targetVal).toBe(20);
        expect(app.isSyncing).toBe(false);

        // Test Loop Prevention
        app.isSyncing = true;
        app.syncInputs(50, updateFn);
        expect(targetVal).toBe(20); // Should not have changed
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
            // Trigger init to register watchers
            app.init();
        });

        test('Changing Rent updates Savings when Locked', () => {
            // Setup
            app.lockedBudget = true;
            app.i.personal.rent.current = 1000;
            app.i.personal.monthlySavings = 500;
            // Total Budget = 1500
            
            // Simulate Rent Change: 1000 -> 1200
            // Expected Savings: 1500 - 1200 = 300
            
            const rentWatcher = watchers['i.personal.rent.current'];
            expect(rentWatcher).toBeDefined();

            // Manually trigger watcher
            // Note: In Alpine, watcher receives (newVal, oldVal)
            // But my logic might rely on current state or arguments.
            // If I implemented syncInputs correctly, it uses current state? 
            // Or passed value?
            
            // Let's assume the implementation uses the new value passed to watcher.
            rentWatcher(1200, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(300);
        });

        test('Changing Savings updates Rent when Locked', () => {
            // Setup
            app.lockedBudget = true;
            app.i.personal.rent.current = 1000;
            app.i.personal.monthlySavings = 500;
            // Total Budget = 1500
            
            const savingsWatcher = watchers['i.personal.monthlySavings'];
            expect(savingsWatcher).toBeDefined();

            // Change Savings: 500 -> 800
            // Expected Rent: 1500 - 800 = 700
            savingsWatcher(800, 500);
            
            expect(app.i.personal.rent.current).toBe(700);
        });

        test('Unlocked changes are independent', () => {
             // Setup
            app.lockedBudget = false;
            app.i.personal.rent.current = 1000;
            app.i.personal.monthlySavings = 500;
            
            const rentWatcher = watchers['i.personal.rent.current'];
            rentWatcher(1200, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(500); // Should not change
        });
        
        test('Savings cannot go below zero', () => {
            // Setup
            app.lockedBudget = true;
            app.i.personal.rent.current = 1000;
            app.i.personal.monthlySavings = 500;
            // Total = 1500
            
            const rentWatcher = watchers['i.personal.rent.current'];
            // Increase Rent to 2000 (Over budget)
            rentWatcher(2000, 1000);
            
            expect(app.i.personal.monthlySavings).toBe(0);
            // Rent should stay 2000 (Total budget expands)
        });
    });
});
