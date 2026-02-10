
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
});
